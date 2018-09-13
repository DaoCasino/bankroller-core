import { IpfsTransportProvider } from "../Ipfs/IpfsTransportProvider";
import Ipfs from "ipfs";
import { createIpfsNode } from "../ipfs/Ipfs";
import IpfsRoom from "ipfs-pubsub-room";

const room12 =
  "02a360faf69c98cbb776ee848ab7e539b0c1266689b6d84366465dab5dc1cc29";

interface IService1 {
  Method1: ({ count: number, name: string }, param2: number) => { result: any };
}
interface IService2 {
  Method2: ({ count: number, name: string }, param2: number) => { result: any };
}

class IService1Impl implements IService1 {
  plus: number;
  constructor() {
    this.plus = 2;
  }
  Method1(
    param1: { count: number; name: string },
    param2: number
  ): { result: any } {
    console.log("serv" + param1.name);

    return { result: param1.count + this.plus + param2 };
  }
}

class IService2Impl implements IService2 {
  plus: number;
  constructor() {
    this.plus = 2;
  }
  Method2(
    params: { count: number; name: string },
    param2: number
  ): { result: any } {
    console.log("serv2" + params.name);

    return { result: params.count + this.plus + param2 };
  }
}
const testRawIpfs = async () => {
  const node1 = await createIpfsNode();
  const node2 = await createIpfsNode();

  const room2 = IpfsRoom(node2, room12, {});

  const room1 = IpfsRoom(node1, room12, {})
    .on("error", error => {
      console.error(error);
    })
    .on("peer joined", id => {
      console.log(`peer joined ${id} to ${node1.id}`);
      room2.sendTo(node1.id, "hi from room2");
    })
    .on("message", msg => {
      console.log(msg.data.toString());
    });

  room2.on("error", error => {
    console.error(error);
  });
  room1.broadcast("hi from room 1");
};
const test = async () => {
  const roomProvider1 = await IpfsTransportProvider.create();
  const roomProvider2 = await IpfsTransportProvider.createAdditional();
  const peerWaitPromise = roomProvider1.waitForPeer(
    roomProvider2.peerId,
    room12
  );
  //const serv1: IService1 = roomProvider2.getRemoteInterface<IService1>(room12);
  const serv2: IService2 = roomProvider1.getRemoteInterface<IService2>(room12);

  //roomProvider1.exposeSevice(room12, new IService1Impl());
  roomProvider2.exposeSevice(room12, new IService2Impl());
  await peerWaitPromise;
  await new Promise(resolve => setTimeout(resolve, 10000));
  const res1 = await serv2.Method2({ count: 1, name: "call serv 2" }, 30);
  console.log(res1);
};

test();
