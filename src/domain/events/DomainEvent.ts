export interface DomainEvent {
  readonly aggregateId: string;
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly eventVersion: number;
  readonly eventData?: Record<string, unknown>;
  
  markForDispatch(): void;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly aggregateId: string;
  public readonly eventName: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number;
  public readonly eventData?: Record<string, unknown>;
  
  private _markedForDispatch: boolean = false;

  constructor(
    aggregateId: string,
    eventData?: Record<string, unknown>,
    eventVersion: number = 1
  ) {
    this.aggregateId = aggregateId;
    this.eventName = this.constructor.name;
    this.occurredOn = new Date();
    this.eventVersion = eventVersion;
    this.eventData = eventData;
  }

  public markForDispatch(): void {
    this._markedForDispatch = true;
  }

  public get isMarkedForDispatch(): boolean {
    return this._markedForDispatch;
  }
}


