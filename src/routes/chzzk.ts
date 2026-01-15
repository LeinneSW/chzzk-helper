import {Router}       from 'express';
import {ChzzkApi}     from '../chzzk/ChzzkApi';
import {ChzzkService} from '../chzzk/ChzzkService';

export const createChzzkRouter = (service: ChzzkService) => {
    const router = Router();
    const api = new ChzzkApi(service);

    router.get('/user-info', api.getUserInfo);
    router.post('/notice', api.handleNotice);
    router.delete('/notice', api.handleNotice);

    router.all(/^\/fetch\/.*/, (req, res) => {
        console.log('Proxy req:', req.path);
        res.send({});
    });

    return router;
};