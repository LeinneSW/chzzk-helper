import {Request, Response} from 'express';
import {ChzzkService}      from "./ChzzkService";

export class ChzzkApi{
    constructor(private service: ChzzkService){}

    getUserInfo = async (_: Request, res: Response) => {
        this.service.client.user()
            .then(user => res.json(user))
            .catch(e => res.status(500).send(e.message));
    };

    handleNotice = async (req: Request, res: Response) => {
        const isDelete = req.method === 'DELETE';
        try{
            const body = isDelete
                ? {channelId: req.body.channelId, chatType: "STREAMING"}
                : {...req.body, chatType: "STREAMING"};

            const response = await this.service.client.fetch(
                'https://comm-api.game.naver.com/nng_main/v1/chats/notices',
                {
                    method: req.method,
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(body)
                }
            );

            if(response.ok){
                const jsonData = await response.json();
                return res.status(jsonData.code || 200).json(jsonData);
            }
            res.sendStatus(response.status);
        }catch(e){
            console.error(e);
            res.sendStatus(500);
        }
    };
}