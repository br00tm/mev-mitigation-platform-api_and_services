import { DomainEvent } from '../events/DomainEvent';

export abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }

  public markEventsForDispatch(): void {
    this._domainEvents.forEach(event => event.markForDispatch());
  }
}
