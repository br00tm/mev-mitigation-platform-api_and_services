import { isValidEthereumAddress } from '@/shared/utils';

export interface CommitmentProps {
  hash: string;
  userAddress: string;
  timestamp: Date;
  nonce?: string;
}

export class Commitment {
  private readonly _hash: string;
  private readonly _userAddress: string;
  private readonly _timestamp: Date;
  private readonly _nonce?: string;

  private constructor(props: CommitmentProps) {
    this._hash = props.hash;
    this._userAddress = props.userAddress;
    this._timestamp = props.timestamp;
    this._nonce = props.nonce;
  }

  public static create(props: CommitmentProps): Commitment {
    // Validations
    if (!props.hash || props.hash.length !== 66 || !props.hash.startsWith('0x')) {
      throw new Error('Invalid commitment hash format');
    }

    if (!isValidEthereumAddress(props.userAddress)) {
      throw new Error('Invalid user address');
    }

    if (!props.timestamp || props.timestamp > new Date()) {
      throw new Error('Invalid timestamp');
    }

    return new Commitment(props);
  }

  public get hash(): string {
    return this._hash;
  }

  public get userAddress(): string {
    return this._userAddress;
  }

  public get timestamp(): Date {
    return this._timestamp;
  }

  public get nonce(): string | undefined {
    return this._nonce;
  }

  public equals(other: Commitment): boolean {
    return this._hash === other._hash && 
           this._userAddress === other._userAddress;
  }

  public isFromUser(userAddress: string): boolean {
    return this._userAddress.toLowerCase() === userAddress.toLowerCase();
  }

  public isExpired(expirationTime: Date): boolean {
    return this._timestamp < expirationTime;
  }
}



