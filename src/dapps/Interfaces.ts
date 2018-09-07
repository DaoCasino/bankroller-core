export type UserId = string;

export interface RoomInfo {
  privateKey: string;
  allowedUsers: UserId[];
}
export interface RequestMessage {
  method: string;
  params: any[];
  id: number;
}
export interface ResponseMessage {
  result: any;
  error: any;
  id: number;
}

export interface IDapp {
  openChannel: (data: any) => void;
  checkOpenChannel: (data: any) => void;
  updateState: (data: any) => void;
  closeByConsent: (data: any) => void;
  checkCloseChannel: (data: any) => void;
  reconnect: (data: any) => void;
  closeTimeout();
  call: (data: any) => void;
  disconnect: (data: any) => void;
}

export interface Contract {
  abi: string;
  address: string;
}
export interface DAppParams {
  slug: string;
  rules: any;
  hash: any;
  users: {};
  sharedRoom: any;
  timer: number;
  checkTimeout: number;
  contract: Contract;
  roomProvider: IRoomProvider;
}
export interface ISharedRoom {
  onConnect: (dappId: string, callback: (data: any) => void) => void;
  bankrollerActive(params: {
    deposit: number;
    dapp: { slug: string; hash: string };
  });
}
export interface IRoomProvider {
  getSharedRoom: (
    userId: string,
    address: string,
    onConnect: (data: any) => void
  ) => ISharedRoom;
  getRoom: <TRemoteInterface extends IRemoteInterface>(
    gameId: string,
    userId: string,
    address: string,
    RoomInfo: RoomInfo
  ) => TRemoteInterface;
}
export interface IRemoteInterface {
  onRequest: (message: RequestMessage) => void;
}
