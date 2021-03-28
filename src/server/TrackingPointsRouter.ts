import {
    Request,
    Response,
    Router
} from 'express';
import { Collection, MongoError, ObjectId } from 'mongodb';
import { FlApi, Logger } from '@jamestiberiuskirk/fl-shared';
import { Responses } from './Responses';
import { TpSet, SingleValue, TrackingPoint } from '../models/TrackingData';
import { Collections, DbClient } from '../clients/db';

/**
 * Creates Express Router for "/tracking/point".
 */
export function TrackingPointsRouter(): Router {
    const router: Router = Router();
    router.get('/', GetTrackingPoints);
    router.post('/', CreateTrackingPoint);
    // router.put('/', UpdateTrackingPoint); // what happened here?
    router.delete('/', DeleteTrackingPoint);

    router.post('/set/', CreateTpSet);
    router.put('/set/', UpdateTpSet);
    // TODO: DELETE????

    return router;
}

/**
 * GET controller for "/tracking/point"
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
    roles[0] === 'microservice' ?
        query.userId = req.query.userId :
        query.userId = res.locals.jwtPayload.id;

    if (req.query.tpTypeId) query.tpTypeId = req.query.tpTypeId;
    if (req.query.tgId) query.tgId = req.query.tgId;

    collection.find(query)
        .toArray((err, items) => {
            if (err) {
                res.status(500)
                    .send(Responses.DatabaseErr);
                Logger.dbErr(err.message);
            }
            return res.send(items);
        });
}

/**
 * POST controller for "/"
 *
 * Body data:
 *  - tg_id: the tracking group referenced.
 *  - tp_type_id: type tracking point.
 *  - notes: notes for the tracking point.
 *  - tp_nr: Number in te group (or workout).
 *  - data: if datatype is single-value, provide it here
 *          otherwise this should be empty.
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
async function CreateTrackingPoint(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const flApi: FlApi = res.locals.flApi;
    const collection: Collection =
        db.getCollection(Collections.TrackingPoints);
    const userId = res.locals.jwtPayload.id;

    let tpTypeId: string;
    // call tp-types to get the type of data
    if (req.body.tpTypeId){
      tpTypeId = req.body.tpTypeId;
    } else {
      return res.status(400).send(Responses.MissingTpTypeId);
    }
    try {
        const type = await flApi.getUserType(userId, tpTypeId);
        if (type.data.length === 0) return res
            .status(400)
            .send(Responses.MissingTpType);

        let data: TpSet[] | SingleValue;
        switch (type.data[0].dataType) {
            case 'sets':
                data = [];
                break;
            case 'single-value':
                data = {
                    value: req.body.data.value,
                    // valueType: type.data.measurementUnit
                };
                break;
            default:
                // Logger.err('Error in the switch case');
                // return res.status(400).send(Responses.MissingTpType);
                // console.log(type.data);
                return res.sendStatus(500);
        }

        // set the newTp.data tp an empty either set or single value
        const newTp: TrackingPoint = {
            userId,
            tpTypeId: req.body.tpTypeId,
            tgId: req.body.tgId,
            notes: req.body.notes,
            tpNr: req.body.tpNr,
            data
        }

        // insert the newTp as a doc in the collection
        await collection.insertOne(newTp);
        return res.send(Responses.Added);
    } catch (err) {
        Logger.err(err.message);
        return res.sendStatus(500);
    }
}

/**
 * PUT controller for "/"
 *
 * NOTE: I dont really need it that much
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
// async function UpdateTrackingPoint(req: Request, res: Response) {
// }

/**
 * DELETE controller for "/point/"
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
async function DeleteTrackingPoint(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    // const flApi: FlApi = res.locals.flApi;
    const collection: Collection =
        db.getCollection(Collections.TrackingPoints);
    const query: { [k: string]: any } = {};

    // Remove all tracking points by tgId if its a request
    //  from a microservice.
    const roles = res.locals.jwtPayload.roles;
    if( roles[0] === 'microservice'){
        // get id of group
        if(req.query.tg_id) {
            query.tgId = req.query.tg_id;
            // query and delete all the tps with the provided tgIds
            try {
                await collection.deleteMany(query);
                return res.send(Responses.DeletedMany);
            } catch (err) {
                Logger.err(err.message);
                return res.sendStatus(500);
            }
        }
    }

    query.userId = res.locals.jwtPayload.id;
    if (req.query.tp_id) {
        // query._id = new ObjectId(req.query.tp_id);
        query._id = new ObjectId(req.query.tp_id as string);
    } else {
        return res.status(400).send(Responses.MissingTpId);
    }
    try {
        await collection.deleteOne(query);
        return res.send(Responses.Deleted);
    } catch (err) {
        Logger.err(err.message);
        return res.sendStatus(500);
    }

}

/**
 * POST controller for "/tracking/point/set/"
 *
 * Body data:
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
async function CreateTpSet(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const flApi: FlApi = res.locals.flApi;
    const collection: Collection =
        db.getCollection(Collections.TrackingPoints);
    const query: { [k: string]: any } = {};
    query.userId = res.locals.jwtPayload.id;

    if (req.body.tp_id) {
        query._id = new ObjectId(req.body.tp_id);
    } else {
        return res.status(400).send(Responses.MissingTpId);
    }

    try {
        // get the tp by the id
        const tp = await collection.findOne<TrackingPoint>(query);
        if (!tp) return res.status(400).send(Responses.TpDoesNotExist);


        // get the tp type and make sure its a set
        const tpType = await flApi.getUserType(query.userId, tp.tpTypeId);
        if (tpType.data[0].dataType !== 'sets')
            return res.status(400).send(Responses.TypeNotASet);

        // create a new set
        const tpSet: TpSet = req.body.tp_set as TpSet;
        tpSet.setNr = (tp.data as TpSet[]).length + 1;
        const update = {
            $push: {
                'data': tpSet
            }
        }

        // insert the new set into the document (using the mongo cursor)
        await collection.findOneAndUpdate(query, update);
        return res.send(Responses.Added);
    } catch (err) {
        if (err instanceof MongoError) {
            Logger.dbErr(err.message);
            return res.status(500).send(Responses.DatabaseErr);
        }
        Logger.err(err.message);
        return res.sendStatus(500);
    }
}

/**
 * PUT controller for "/set/"
 *
 * TODO: Not finished
 *
 * Body data:
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
async function UpdateTpSet(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const flApi: FlApi = res.locals.flApi;
    const collection: Collection =
        db.getCollection(Collections.TrackingPoints);
    const query: { [k: string]: any } = {};
    query.userId = res.locals.jwtPayload.id;

    if (req.body.tp_id) {
        query._id = new ObjectId(req.body.tp_id);
    } else {
        return res.status(400).send(Responses.MissingTpId);
    }

    try {
        // get the tp by the id
        const tp = await collection.findOne<TrackingPoint>(query);
        if (!tp) return res.status(400).send(Responses.TpDoesNotExist);


        // get the tp type and make sure its a set
        const tpType = await flApi.getUserType(query.userId, tp.tpTypeId);
        if (tpType.data[0].dataType !== 'sets')
            return res.status(400).send(Responses.TypeNotASet);

        // update the existing set with the new one
        const tpSetUpdate: TpSet = req.body.tp_set as TpSet;
        const dataArr: TpSet[] = tp.data as TpSet[];
        if (tpSetUpdate.isDropset) dataArr[tpSetUpdate.setNr - 1].isDropset = tpSetUpdate.isDropset;
        if (tpSetUpdate.reps) dataArr[tpSetUpdate.setNr - 1].reps = tpSetUpdate.reps;
        if (tpSetUpdate.value) dataArr[tpSetUpdate.setNr - 1].value = tpSetUpdate.value;

        const update = {
            $set: {
                'data': dataArr
            }
        }

        // insert the updated set into the document (using the mongo cursor)
        await collection.findOneAndUpdate(query, update);
        return res.send(Responses.Updated);
    } catch (err) {
        if (err instanceof MongoError) {
            Logger.dbErr(err.message);
            return res.status(500).send(Responses.DatabaseErr);
        }
        Logger.err(err.message);
        return res.sendStatus(500);
    }
}
