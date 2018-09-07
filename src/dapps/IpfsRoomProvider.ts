import {
  IRoomProvider,
  ISharedRoom,
  RoomInfo,
  RequestMessage,
  IRemoteInterface
} from "./Interfaces";
import * as messaging from "dc-messaging";
import { RemoteProxy, getId } from "../RemoteProxy";

export class IPFSSharedRoom implements ISharedRoom {
  onConnect: (dappId: string, callback: (data: any) => void) => void;
  rtc: messaging.RTC;
  gameId: string;
  constructor(
    rtc: messaging.RTC,
    gameId: string,
    onConnect: (dappId: string, callback: (data: any) => void) => void
  ) {
    this.onConnect = onConnect;
    this.rtc = rtc;
    this.gameId = gameId;
    rtc.on("all", data => {
      if (!data || !data.action || data.action === "bankroller_active") {
        return;
      }
      // User want to connect
      if (data.action === "connect" && data.slug === gameId) {
        onConnect(gameId, data);
      }
    });
  }
  bankrollerActive(params: {
    deposit: number;
    dapp: { slug: string; hash: string };
  }) {
    this.rtc.sendMsg({
      method: "bankrollerActive",
      params: [params],
      id: getId()
    });
  }
}

export class IpfsRoomProvider implements IRoomProvider {
  private sharedRoom: IPFSSharedRoom;

  getSharedRoom(
    gameId: string,
    userId: any,
    address: any,
    onConnect: (data: any) => void
  ): ISharedRoom {
    if (!this.sharedRoom) return this.sharedRoom;
    const rtc = new messaging.RTC(userId, address);
    this.sharedRoom = new IPFSSharedRoom(rtc, gameId, onConnect);
    return this.sharedRoom;
  }
  getRoom<TRemoteInterface extends IRemoteInterface>(
    userId: string,
    address: string,
    roomInfo: RoomInfo
  ): TRemoteInterface {
    const ipfsRTC = new messaging.RTC(userId, address, roomInfo);
    const proxy = new RemoteProxy();
    ipfsRTC.on("all", proxy.onRequestResponse);
    return proxy.getProxy(ipfsRTC);
  }
}
