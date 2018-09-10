export type UserId = string;

export interface GameInfo {
  slug: string;
  hash: string;
  contract: Contract;
  gameId: string;
}
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
export interface DAppInstanceParams {
  userId: UserId;
  num: number;
  rules: any;
  payChannelContract: any;
  logic: any;
  roomProvider: IRoomProvider;
  onFinish: (userId: UserId) => void;
  gameInfo: GameInfo;
}
export interface OpenChannelParams {
  channelId: string;
  playerAddress: string;
  playerDeposit: number;
  gameData: any;
}
export interface CallParams {
  gamedata: any;
  seed: any;
  method: string;
  args: any[];
  nonce: number;
  userBet: number;
  sign: string;
}
export interface OpenChannelResponse {
  channelId: any; //TODO
  playerAddress: string;
  playerDeposit: number;
  bankrollerAddress: string;
  bankrollerDeposit: number;
  openingBlock: string;
  gameData: string;
  _N: string;
  _E: string;
}
export interface SignedResponse<TResponse> {
  response: TResponse;
  signature: string;
}
export interface IDApp {}
export interface IDappInstance {
  openChannel: (
    data: OpenChannelParams
  ) => Promise<SignedResponse<OpenChannelResponse>>;
  checkOpenChannel: (data: { userId: UserId }) => Promise<any>;
  updateState: (data: { userId: UserId; state: any }) => { status: string };
  closeByConsent: (data: any) => { sign: string };
  checkCloseChannel: (data: any) => void;
  call: (data: any) => void;
  reconnect: (data: any) => void;
  //closeTimeout(); WTF???
  disconnect: (data: any) => void;
}

export interface Contract {
  abi: string;
  address: string;
}
export interface DAppParams {
  slug: string;
  rules: any;
  // timer: number;
  // checkTimeout: number;
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
    gameId: string,
    onConnect: (data: any) => void
  ) => Promise<ISharedRoom>;
  getRoom: <TRemoteInterface extends IRemoteInterface>(
    address: string,
    RoomInfo: RoomInfo
  ) => Promise<TRemoteInterface>;
}
export interface IRemoteInterface {
  onRequest: (message: RequestMessage) => void;
  sendResponse: (message: ResponseMessage) => void;
}
