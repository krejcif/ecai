/**
 * Price alert system for monitoring and notifying price changes
 */

import { ProductDocument } from '../../database/collections';
import { PricePoint } from './price-tracker';
import { PriceAnomaly } from './price-tracker';

export interface PriceAlert {
  id: string;
  productId: string;
  type: 'price-drop' | 'price-increase' | 'threshold' | 'competitor-change' | 'anomaly';
  condition: AlertCondition;
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  metadata?: Record<string, any>;
}

export interface AlertCondition {
  // Price threshold conditions
  targetPrice?: number;
  priceDropPercent?: number;
  priceIncreasePercent?: number;
  absoluteChange?: number;

  // Competitor conditions
  competitorId?: string;
  competitorPriceDifference?: number;

  // Anomaly conditions
  anomalySeverity?: 'low' | 'medium' | 'high';

  // Time conditions
  checkInterval?: number; // Minutes between checks
}

export interface AlertNotification {
  alertId: string;
  productId: string;
  productName: string;
  type: PriceAlert['type'];
  message: string;
  timestamp: Date;
  data: {
    oldPrice?: number;
    newPrice: number;
    change?: number;
    changePercent?: number;
    competitor?: {
      id: string;
      name: string;
      price: number;
    };
    anomaly?: PriceAnomaly;
  };
  severity: 'info' | 'warning' | 'critical';
}

export interface AlertDelivery {
  method: 'in-app' | 'webhook' | 'email' | 'sms';
  destination: string;
  enabled: boolean;
}

export interface WebhookPayload {
  event: 'price.alert.triggered';
  timestamp: Date;
  alert: PriceAlert;
  notification: AlertNotification;
}

export interface AlertServiceConfig {
  defaultCheckInterval?: number; // Minutes (default: 60)
  maxAlertsPerProduct?: number; // Maximum alerts per product (default: 10)
  webhookTimeout?: number; // Webhook timeout in ms (default: 5000)
  retryAttempts?: number; // Webhook retry attempts (default: 3)
}

export class PriceAlertService {
  private alerts: Map<string, PriceAlert>;
  private deliveryMethods: Map<string, AlertDelivery[]>;
  private notificationQueue: AlertNotification[];
  private config: Required<AlertServiceConfig>;
  private lastCheck: Map<string, Date>;

  constructor(config: AlertServiceConfig = {}) {
    this.alerts = new Map();
    this.deliveryMethods = new Map();
    this.notificationQueue = [];
    this.lastCheck = new Map();
    this.config = {
      defaultCheckInterval: config.defaultCheckInterval ?? 60,
      maxAlertsPerProduct: config.maxAlertsPerProduct ?? 10,
      webhookTimeout: config.webhookTimeout ?? 5000,
      retryAttempts: config.retryAttempts ?? 3
    };
  }

  /**
   * Create a new price alert
   */
  createAlert(
    productId: string,
    type: PriceAlert['type'],
    condition: AlertCondition,
    metadata?: Record<string, any>
  ): PriceAlert {
    // Check if we've hit the limit for this product
    const existingAlerts = Array.from(this.alerts.values()).filter(
      a => a.productId === productId
    );

    if (existingAlerts.length >= this.config.maxAlertsPerProduct) {
      throw new Error(`Maximum alerts (${this.config.maxAlertsPerProduct}) reached for product ${productId}`);
    }

    const alert: PriceAlert = {
      id: this.generateAlertId(),
      productId,
      type,
      condition: {
        ...condition,
        checkInterval: condition.checkInterval ?? this.config.defaultCheckInterval
      },
      enabled: true,
      createdAt: new Date(),
      triggerCount: 0,
      metadata
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Create a price drop alert
   */
  createPriceDropAlert(
    productId: string,
    dropPercent?: number,
    targetPrice?: number
  ): PriceAlert {
    return this.createAlert(productId, 'price-drop', {
      priceDropPercent: dropPercent,
      targetPrice
    });
  }

  /**
   * Create a threshold alert
   */
  createThresholdAlert(productId: string, targetPrice: number): PriceAlert {
    return this.createAlert(productId, 'threshold', {
      targetPrice
    });
  }

  /**
   * Create a competitor price change alert
   */
  createCompetitorAlert(
    productId: string,
    competitorId: string,
    priceDifference?: number
  ): PriceAlert {
    return this.createAlert(productId, 'competitor-change', {
      competitorId,
      competitorPriceDifference: priceDifference
    });
  }

  /**
   * Create an anomaly alert
   */
  createAnomalyAlert(
    productId: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): PriceAlert {
    return this.createAlert(productId, 'anomaly', {
      anomalySeverity: severity
    });
  }

  /**
   * Update an existing alert
   */
  updateAlert(
    alertId: string,
    updates: Partial<Pick<PriceAlert, 'condition' | 'enabled' | 'metadata'>>
  ): PriceAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    if (updates.condition) {
      alert.condition = { ...alert.condition, ...updates.condition };
    }
    if (updates.enabled !== undefined) {
      alert.enabled = updates.enabled;
    }
    if (updates.metadata) {
      alert.metadata = { ...alert.metadata, ...updates.metadata };
    }

    return alert;
  }

  /**
   * Delete an alert
   */
  deleteAlert(alertId: string): boolean {
    return this.alerts.delete(alertId);
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): PriceAlert | null {
    return this.alerts.get(alertId) || null;
  }

  /**
   * Get all alerts for a product
   */
  getProductAlerts(productId: string): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(
      a => a.productId === productId
    );
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.enabled);
  }

  /**
   * Check price against alerts and trigger if conditions are met
   */
  checkPrice(
    product: ProductDocument,
    previousPrice?: number,
    competitors?: Array<{ id: string; name: string; price: number }>
  ): AlertNotification[] {
    const alerts = this.getProductAlerts(product.id).filter(a => a.enabled);
    const notifications: AlertNotification[] = [];

    for (const alert of alerts) {
      // Check if enough time has passed since last check
      const lastCheckTime = this.lastCheck.get(alert.id);
      const checkInterval = (alert.condition.checkInterval || this.config.defaultCheckInterval) * 60 * 1000;

      if (lastCheckTime && Date.now() - lastCheckTime.getTime() < checkInterval) {
        continue;
      }

      const notification = this.evaluateAlert(alert, product, previousPrice, competitors);

      if (notification) {
        notifications.push(notification);
        alert.lastTriggered = new Date();
        alert.triggerCount++;
        this.lastCheck.set(alert.id, new Date());
      }
    }

    // Add to notification queue
    this.notificationQueue.push(...notifications);

    return notifications;
  }

  /**
   * Check anomaly against alerts
   */
  checkAnomaly(anomaly: PriceAnomaly, product: ProductDocument): AlertNotification[] {
    const alerts = this.getProductAlerts(product.id).filter(
      a => a.enabled && a.type === 'anomaly'
    );

    const notifications: AlertNotification[] = [];

    for (const alert of alerts) {
      const requiredSeverity = alert.condition.anomalySeverity || 'medium';
      const severityLevels = { low: 1, medium: 2, high: 3 };

      if (severityLevels[anomaly.severity] >= severityLevels[requiredSeverity]) {
        const notification: AlertNotification = {
          alertId: alert.id,
          productId: product.id,
          productName: product.name,
          type: 'anomaly',
          message: `Price anomaly detected for ${product.name}: ${anomaly.type}`,
          timestamp: new Date(),
          data: {
            newPrice: anomaly.actualPrice,
            anomaly
          },
          severity: anomaly.severity === 'high' ? 'critical' : 'warning'
        };

        notifications.push(notification);
        alert.lastTriggered = new Date();
        alert.triggerCount++;
      }
    }

    this.notificationQueue.push(...notifications);
    return notifications;
  }

  /**
   * Add delivery method for notifications
   */
  addDeliveryMethod(alertId: string, delivery: AlertDelivery): void {
    const methods = this.deliveryMethods.get(alertId) || [];
    methods.push(delivery);
    this.deliveryMethods.set(alertId, methods);
  }

  /**
   * Remove delivery method
   */
  removeDeliveryMethod(alertId: string, method: AlertDelivery['method']): void {
    const methods = this.deliveryMethods.get(alertId) || [];
    const filtered = methods.filter(m => m.method !== method);
    this.deliveryMethods.set(alertId, filtered);
  }

  /**
   * Get delivery methods for an alert
   */
  getDeliveryMethods(alertId: string): AlertDelivery[] {
    return this.deliveryMethods.get(alertId) || [];
  }

  /**
   * Process notification queue and deliver alerts
   */
  async processNotifications(): Promise<{
    delivered: number;
    failed: number;
    errors: Array<{ notification: AlertNotification; error: string }>;
  }> {
    const results = {
      delivered: 0,
      failed: 0,
      errors: [] as Array<{ notification: AlertNotification; error: string }>
    };

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift()!;
      const deliveryMethods = this.getDeliveryMethods(notification.alertId);

      if (deliveryMethods.length === 0) {
        // Default to in-app notification
        results.delivered++;
        continue;
      }

      for (const method of deliveryMethods.filter(m => m.enabled)) {
        try {
          await this.deliverNotification(notification, method);
          results.delivered++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            notification,
            error: String(error)
          });
        }
      }
    }

    return results;
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(): AlertNotification[] {
    return [...this.notificationQueue];
  }

  /**
   * Clear notification queue
   */
  clearNotificationQueue(): void {
    this.notificationQueue = [];
  }

  /**
   * Export alerts configuration
   */
  exportAlerts(): string {
    const data = {
      alerts: Array.from(this.alerts.values()),
      deliveryMethods: Array.from(this.deliveryMethods.entries()).map(([id, methods]) => ({
        alertId: id,
        methods
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import alerts configuration
   */
  importAlerts(json: string): void {
    try {
      const data = JSON.parse(json);

      if (data.alerts) {
        for (const alert of data.alerts) {
          alert.createdAt = new Date(alert.createdAt);
          if (alert.lastTriggered) {
            alert.lastTriggered = new Date(alert.lastTriggered);
          }
          this.alerts.set(alert.id, alert);
        }
      }

      if (data.deliveryMethods) {
        for (const { alertId, methods } of data.deliveryMethods) {
          this.deliveryMethods.set(alertId, methods);
        }
      }
    } catch (error) {
      throw new Error(`Failed to import alerts: ${error}`);
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlert(
    alert: PriceAlert,
    product: ProductDocument,
    previousPrice?: number,
    competitors?: Array<{ id: string; name: string; price: number }>
  ): AlertNotification | null {
    const { condition } = alert;
    const currentPrice = product.price;

    switch (alert.type) {
      case 'price-drop':
        return this.evaluatePriceDropAlert(alert, product, currentPrice, previousPrice);

      case 'price-increase':
        return this.evaluatePriceIncreaseAlert(alert, product, currentPrice, previousPrice);

      case 'threshold':
        if (condition.targetPrice && currentPrice <= condition.targetPrice) {
          return {
            alertId: alert.id,
            productId: product.id,
            productName: product.name,
            type: 'threshold',
            message: `${product.name} price reached target: $${currentPrice}`,
            timestamp: new Date(),
            data: {
              oldPrice: previousPrice,
              newPrice: currentPrice,
              change: previousPrice ? currentPrice - previousPrice : 0,
              changePercent: previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0
            },
            severity: 'info'
          };
        }
        break;

      case 'competitor-change':
        if (competitors && condition.competitorId) {
          return this.evaluateCompetitorAlert(alert, product, competitors);
        }
        break;
    }

    return null;
  }

  /**
   * Evaluate price drop alert
   */
  private evaluatePriceDropAlert(
    alert: PriceAlert,
    product: ProductDocument,
    currentPrice: number,
    previousPrice?: number
  ): AlertNotification | null {
    if (!previousPrice) return null;

    const { condition } = alert;
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

    // Check percentage drop
    if (condition.priceDropPercent && changePercent <= -condition.priceDropPercent) {
      return {
        alertId: alert.id,
        productId: product.id,
        productName: product.name,
        type: 'price-drop',
        message: `${product.name} price dropped by ${Math.abs(changePercent).toFixed(1)}%`,
        timestamp: new Date(),
        data: {
          oldPrice: previousPrice,
          newPrice: currentPrice,
          change,
          changePercent
        },
        severity: Math.abs(changePercent) >= 20 ? 'critical' : 'warning'
      };
    }

    // Check absolute drop
    if (condition.absoluteChange && change <= -condition.absoluteChange) {
      return {
        alertId: alert.id,
        productId: product.id,
        productName: product.name,
        type: 'price-drop',
        message: `${product.name} price dropped by $${Math.abs(change).toFixed(2)}`,
        timestamp: new Date(),
        data: {
          oldPrice: previousPrice,
          newPrice: currentPrice,
          change,
          changePercent
        },
        severity: 'warning'
      };
    }

    return null;
  }

  /**
   * Evaluate price increase alert
   */
  private evaluatePriceIncreaseAlert(
    alert: PriceAlert,
    product: ProductDocument,
    currentPrice: number,
    previousPrice?: number
  ): AlertNotification | null {
    if (!previousPrice) return null;

    const { condition } = alert;
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

    // Check percentage increase
    if (condition.priceIncreasePercent && changePercent >= condition.priceIncreasePercent) {
      return {
        alertId: alert.id,
        productId: product.id,
        productName: product.name,
        type: 'price-increase',
        message: `${product.name} price increased by ${changePercent.toFixed(1)}%`,
        timestamp: new Date(),
        data: {
          oldPrice: previousPrice,
          newPrice: currentPrice,
          change,
          changePercent
        },
        severity: changePercent >= 20 ? 'critical' : 'info'
      };
    }

    return null;
  }

  /**
   * Evaluate competitor alert
   */
  private evaluateCompetitorAlert(
    alert: PriceAlert,
    product: ProductDocument,
    competitors: Array<{ id: string; name: string; price: number }>
  ): AlertNotification | null {
    const { condition } = alert;
    const competitor = competitors.find(c => c.id === condition.competitorId);

    if (!competitor) return null;

    const priceDiff = product.price - competitor.price;

    // Check if our price is higher than competitor by threshold
    if (condition.competitorPriceDifference && priceDiff >= condition.competitorPriceDifference) {
      return {
        alertId: alert.id,
        productId: product.id,
        productName: product.name,
        type: 'competitor-change',
        message: `${product.name} is $${priceDiff.toFixed(2)} more expensive than ${competitor.name}`,
        timestamp: new Date(),
        data: {
          newPrice: product.price,
          competitor: competitor
        },
        severity: 'warning'
      };
    }

    return null;
  }

  /**
   * Deliver notification through specified method
   */
  private async deliverNotification(
    notification: AlertNotification,
    delivery: AlertDelivery
  ): Promise<void> {
    switch (delivery.method) {
      case 'in-app':
        // In-app notifications are handled by keeping them in queue
        // They can be fetched by the application
        break;

      case 'webhook':
        await this.deliverWebhook(notification, delivery.destination);
        break;

      case 'email':
        // Email delivery would be implemented here
        console.log(`Email notification to ${delivery.destination}: ${notification.message}`);
        break;

      case 'sms':
        // SMS delivery would be implemented here
        console.log(`SMS notification to ${delivery.destination}: ${notification.message}`);
        break;
    }
  }

  /**
   * Deliver notification via webhook
   */
  private async deliverWebhook(notification: AlertNotification, url: string): Promise<void> {
    const alert = this.alerts.get(notification.alertId);
    if (!alert) {
      throw new Error(`Alert ${notification.alertId} not found`);
    }

    const payload: WebhookPayload = {
      event: 'price.alert.triggered',
      timestamp: new Date(),
      alert,
      notification
    };

    // This is a placeholder - in a real implementation, you would use fetch or axios
    // For now, we'll just log it
    console.log(`Webhook delivery to ${url}:`, JSON.stringify(payload, null, 2));

    // Simulate webhook call
    // In production, replace with actual HTTP request:
    // const response = await fetch(url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    //   timeout: this.config.webhookTimeout
    // });
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
