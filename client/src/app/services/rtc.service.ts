import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject } from "rxjs";
import { User, Peer } from "../models";
import { Instance } from "simple-peer";

declare var SimplePeer: any;

@Injectable({
  providedIn: "root",
})
export class RtcService {
  public users: BehaviorSubject<User[]>;

  private onSignalToSend = new Subject<Peer>();
  private onStream = new Subject<Peer>();
  private onConnect = new Subject<Peer>();
  private onData = new Subject<Peer>();

  public currentPeer: Instance;

  constructor() {
    this.users = new BehaviorSubject([]);
  }

  public newUser(user: User) {
    this.users.next([...this.users.getValue(), user]);
  }

  public disconnectedUser(user: User) {
    const users = this.users
      .getValue()
      // TODO: pretty sure this should be !==
      .filter((u) => u.connectionId === user.connectionId);
    this.users.next(users);
  }

  // Create simple-peer instance and encapsulate RTC events
  public createPeer(
    stream: MediaStream,
    userId: string,
    initiator: boolean
  ): Instance {
    const peer = new SimplePeer({ initiator, stream });

    peer.on("signal", (data) => {
      this.onSignalToSend.next({
        id: userId,
        data: JSON.stringify(data),
      });
    });

    peer.on("stream", (data) => {
      console.log("On stream", data);
      this.onStream.next({
        data,
        id: userId,
      });
    });

    peer.on("connect", () => {
      this.onConnect.next({
        id: userId,
        data: null,
      });
    });

    peer.on("data", (data) => {
      this.onData.next({
        data,
        id: userId,
      });
    });

    return peer;
  }

  public signalPeer(userId: string, signalStr: string, stream: MediaStream) {
    const signal = JSON.parse(signalStr);
    // If current peer exists, it means we are the initiator of the call
    if (this.currentPeer) {
      return this.currentPeer.signal(signal);
    }
    // If peers exists it means we are not the initiator
    // and we need to create a peer instance to receive the video call
    this.currentPeer = this.createPeer(stream, userId, false);
    this.currentPeer.signal(signal);
  }

  public sendMessage(message: string) {
    this.currentPeer.send(message);
  }
}
