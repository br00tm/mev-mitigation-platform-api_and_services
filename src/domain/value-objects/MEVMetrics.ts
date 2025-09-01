import { weiToEth, formatEthValue } from '@/shared/utils';

export interface MEVMetricsProps {
  extractedValue: string; // in wei
  savingsGenerated: string; // in wei
  totalTransactions: number;
  successfulTransactions: number;
  averageGasPrice: string; // in wei
  totalGasUsed: string; // in wei
}

export class MEVMetrics {
  private readonly props: MEVMetricsProps;

  private constructor(props: MEVMetricsProps) {
    this.props = props;
  }

  public static create(props: MEVMetricsProps): MEVMetrics {
    // Validations
    if (BigInt(props.extractedValue) < 0) {
      throw new Error('Extracted value cannot be negative');
    }

    if (BigInt(props.savingsGenerated) < 0) {
      throw new Error('Savings generated cannot be negative');
    }

    if (props.totalTransactions < 0) {
      throw new Error('Total transactions cannot be negative');
    }

    if (props.successfulTransactions < 0 || props.successfulTransactions > props.totalTransactions) {
      throw new Error('Invalid successful transactions count');
    }

    if (BigInt(props.averageGasPrice) < 0) {
      throw new Error('Average gas price cannot be negative');
    }

    if (BigInt(props.totalGasUsed) < 0) {
      throw new Error('Total gas used cannot be negative');
    }

    return new MEVMetrics(props);
  }

  public get extractedValue(): string {
    return this.props.extractedValue;
  }

  public get extractedValueEth(): string {
    return weiToEth(this.props.extractedValue);
  }

  public get savingsGenerated(): string {
    return this.props.savingsGenerated;
  }

  public get savingsGeneratedEth(): string {
    return weiToEth(this.props.savingsGenerated);
  }

  public get totalTransactions(): number {
    return this.props.totalTransactions;
  }

  public get successfulTransactions(): number {
    return this.props.successfulTransactions;
  }

  public get averageGasPrice(): string {
    return this.props.averageGasPrice;
  }

  public get totalGasUsed(): string {
    return this.props.totalGasUsed;
  }

  // Calculated metrics
  public calculateEfficiency(): number {
    const extracted = BigInt(this.props.extractedValue);
    const savings = BigInt(this.props.savingsGenerated);
    const total = extracted + savings;
    
    if (total === BigInt(0)) return 0;
    
    return Number(savings * BigInt(100)) / Number(total);
  }

  public calculateSuccessRate(): number {
    if (this.props.totalTransactions === 0) return 0;
    return (this.props.successfulTransactions / this.props.totalTransactions) * 100;
  }

  public calculateAverageGasPriceGwei(): string {
    const gwei = BigInt(this.props.averageGasPrice) / BigInt(10 ** 9);
    return gwei.toString();
  }

  public calculateTotalGasCostEth(): string {
    const totalCost = BigInt(this.props.totalGasUsed) * BigInt(this.props.averageGasPrice);
    return weiToEth(totalCost.toString());
  }

  public formatForDisplay(): {
    extractedValueEth: string;
    savingsGeneratedEth: string;
    efficiency: string;
    successRate: string;
    averageGasPriceGwei: string;
    totalGasCostEth: string;
  } {
    return {
      extractedValueEth: formatEthValue(this.props.extractedValue),
      savingsGeneratedEth: formatEthValue(this.props.savingsGenerated),
      efficiency: `${this.calculateEfficiency().toFixed(2)}%`,
      successRate: `${this.calculateSuccessRate().toFixed(2)}%`,
      averageGasPriceGwei: this.calculateAverageGasPriceGwei(),
      totalGasCostEth: formatEthValue(this.calculateTotalGasCostEth()),
    };
  }

  public addMetrics(other: MEVMetrics): MEVMetrics {
    return MEVMetrics.create({
      extractedValue: (BigInt(this.props.extractedValue) + BigInt(other.props.extractedValue)).toString(),
      savingsGenerated: (BigInt(this.props.savingsGenerated) + BigInt(other.props.savingsGenerated)).toString(),
      totalTransactions: this.props.totalTransactions + other.props.totalTransactions,
      successfulTransactions: this.props.successfulTransactions + other.props.successfulTransactions,
      averageGasPrice: this.calculateWeightedAverageGasPrice(other),
      totalGasUsed: (BigInt(this.props.totalGasUsed) + BigInt(other.props.totalGasUsed)).toString(),
    });
  }

  private calculateWeightedAverageGasPrice(other: MEVMetrics): string {
    const thisWeight = BigInt(this.props.totalGasUsed);
    const otherWeight = BigInt(other.props.totalGasUsed);
    const totalWeight = thisWeight + otherWeight;
    
    if (totalWeight === BigInt(0)) return '0';
    
    const weightedSum = (BigInt(this.props.averageGasPrice) * thisWeight) + 
                        (BigInt(other.props.averageGasPrice) * otherWeight);
    
    return (weightedSum / totalWeight).toString();
  }
}


