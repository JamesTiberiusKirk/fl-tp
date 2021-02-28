import { Request, Response, Router } from 'express';
import { Collections, DbClient } from '../clients/db';
import { Collection } from 'mongodb';
import { Responses } from './Responses';
import { TrackingPoint } from '../models/TrackingData';
import { Logger } from '@jamestiberiuskirk/fl-shared';

/**
 * Creates Express Router for "/tracking/points".
 */
export function TrackingPoints(): Router {
    const router: Router = Router();
    router.get('/', GetTrackingPoints);
    router.post('/', CreateTrackingPoint);
    router.put('/', UpdateTrackingPoint);
    router.delete('/', DeleteTrackingPoint);
    return router;
}

/**
 * GET controller for "/tracking/points"
 *
 * This gets the tracking poits and the data
 * connected to them.
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
function GetTrackingPoints(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const collection: Collection =
        db.getCollection(Collections.TrackingPoints);
    const query: { [k: string]: any } = {};

    const roles = res.locals.jwtPayload.roles;
    roles[0] === 'microservices' ?
        query.userId = req.query.userId :
        query.userId = res.locals.jwtPayload.id;

    if (req.query.tpTypeId) query.tpTypeId = req.query.tpTypeId;

    collection.find(query).toArray((err, items) => {
        if (err) {
            res.status(500).send(Responses.DatabaseErr);
            Logger.dbErr(err.message);
        }

        return res.send(items);
    });
}

/**
 * POST controller for "/"
 *
 * Body data:
 *  - tg-id: the tracking group referenced.
 *  - tg-type-id: type tracking point.
 *  - notes: notes for the tracking point.
 *  - tpNr: Number in te group (or workout).
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
function CreateTrackingPoint(req: Request, res: Response) {

}


/**
 * POST controller for "/sets"
 *
 * Body data:
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
function CreateSet(req: Request, res: Response){

}




/**
 * PUT controller for "/"
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
function UpdateTrackingPoint(req: Request, res: Response) {

}

/**
 * DELETE controller for "/"
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
function DeleteTrackingPoint(req: Request, res: Response) {

}
