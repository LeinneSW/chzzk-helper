import express from "express"
import {Server} from "http";
import path from "path";
import {WebSocketServer} from 'ws'

export class Web{
    private static _instance: Web;
    static get instance(){
        return this._instance ?? (this._instance = new Web());
    }

    readonly app = express();
    readonly server: Server;
    readonly socket: WebSocketServer;

    private constructor(){
        this.app.use(express.json())
        this.app.use('/', express.static(path.join(__dirname , './../../public/')))

        this.server = this.app.listen(54321)
        this.socket = new WebSocketServer({server: this.server, path: '/ws'})
    }
}