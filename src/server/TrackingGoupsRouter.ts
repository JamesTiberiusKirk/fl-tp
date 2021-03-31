import { Request, Response, Router } from 'express';
import { Logger, FlApi } from '@jamestiberiuskirk/fl-shared';
import { Collections, DbClient } from '../clients/db';
import { Collection, ObjectId } from 'mongodb';
import { Responses } from './Responses';
import { TrackingGroup, TrackingGroupResponse } from '../models/TrackingData';

/**
 * Creates Express Router object for tracking groups.
 */
export function TrackingGroupRouter(): Router {
    const router: Router = Router();
    router.get('/', GetTrackingGroups);
    router.post('/start', StartTrackingGroup);
    router.post('/stop', StopTrackingGroup);
    router.put('/', UpdateTrackingGroups);
    router.delete('/', DeleteTrackingGroups);
    return router;
}

/**
 * GET controller for "/tracking/group/"
 *
 * URL params:
 *  - userId (internal Ms use)
 *  - tgId: string
 *  - notes: string
 *
 * @param req Express Request obect.
 * @param res Express Response object.
 */
async function GetTrackingGroups(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const collection: Collection =
        db.getCollection(Collections.TrackingGroups);
    const query: { [k: string]: any } = {};

    const roles = res.locals.jwtPayload.roles;
    roles[0] === 'microservices' ?
        query.userId = req.query.userId :
        query.userId = res.locals.jwtPayload.id;

    if (req.query.tgId) query._id = new ObjectId(req.query.tgId as string);
    if (req.query.notes) query.notes = req.query.notes;

    try {
        const dbResults = await collection.find(query).toArray();
        const results: TrackingGroupResponse[] = [];
        dbResults.forEach((val)=>{
          results.push({
            tgId: val._id,
            startTime: val.startTime,
            endTime: val.endTime,
            notes: val.notes,
          })
        });
        return res.send(results);
    } catch (err) {
        Logger.dbErr(err.message);
        return res.status(500).send(Responses.DatabaseErr);
    }
}

/**
 * POST controller for "/tracking/group/start"
 *
 * Start a new tracking group (start workout).
 * URL params:
 *  - userId (internal Ms use)
 *
 * Body:
 *  - notes: string
 *
 * @param req Express Request object.
 * @param res Express Response object.
 */
async function StartTrackingGroup(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const collection: Collection =
        db.getCollection(Collections.TrackingGroups);
    let userId;
    userId = res.locals.jwtPayload.id;

    try {
        // Checks if user already started a group
        const queryForExisting = {
            userId,
            endTime: undefined
        }
        const existing = await collection.find(queryForExisting)
            .map((d) => d._id).toArray();
        if (existing.length > 0) {
            return res.status(400).send({
                err: Responses.UserAlreadyStartedGroup,
                tgId: existing
            });
        }
    } catch (err) {
        Logger.dbErr(err.message);
        return res.status(500).send();
    }

    const newTrackingGroup: TrackingGroup = {
        userId,
        startTime: Date.now(),
        endTime: undefined,
        notes: req.body.notes,
    };

    try {
        await collection.insertOne(newTrackingGroup);
        return res.send(Responses.Added);
    } catch (err) {
        Logger.dbErr(err.message);
        return res.status(500).send();
    }
}

/**
 * POST controller for "/tracking/group/stop"
 *
 * Stop the tracking group (finish workout).
 *
 * @param req Express Request object.
 * @param res Express Response object.
 */
async function StopTrackingGroup(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const collection: Collection =
        db.getCollection(Collections.TrackingGroups);
    const query: { [k: string]: any } = {};
    query.userId = res.locals.jwtPayload.id;

    const update: { [k: string]: any } = {};
    update.endTime = Date.now();

    if (req.query.tgId) {
        query._id = new ObjectId(req.query.tgId as string);
    } else {
        return res.status(400).send(Responses.MissingTgId);
    }

    try {
        await collection.updateOne(query,{$set:{"endTime":update.endTime}});
        return res.send(Responses.TrackingGroupStopped);
    } catch (err) {
        Logger.dbErr(err.message);
        return res.status(500).send(Responses.DatabaseErr);
    }
}


/**
 * PUT controller for "/tracking/group/"
 *
 * @param req Express Request object.
 * @param res Express Response object.
 */
async function UpdateTrackingGroups(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const collection: Collection =
        db.getCollection(Collections.TrackingGroups);
    const query: { [k: string]: any } = {};
    const update: { [k: string]: any } = {};
    query.userId = new ObjectId(res.locals.jwtPayload.id);

    if (req.body.tgId) {
        query._id = req.body.tgId;
    } else {
        return res.status(400).send(Responses.MissingTgId);
    }

    if (req.body.startTime) update.startTime = req.body.startTime;
    if (req.body.notes) update.notes = req.body.notes;

    if (update === {}) return res
        .status(400)
        .send(Responses.NothingToUpdate)

    try {
        await collection.findOneAndUpdate(query, {$set:update});
        return res.send(Responses.Updated);
    } catch (err) {
        Logger.dbErr(err.message);
        return res.status(500).send(Responses.DatabaseErr);
    }
}

/**
 * DELETE controller for "/group/"
 * Query:
 *  - tgId: tg id
 *
 * @param req Express Request object.
 * @param res Express Response object.
 */
async function DeleteTrackingGroups(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const flApi: FlApi = res.locals.flApi;
    const collection: Collection =
        db.getCollection(Collections.TrackingGroups);
    const query: { [k: string]: any } = {};

    const roles = res.locals.jwtPayload.roles;
    roles[0] === 'microservices' ?
        query.userId = req.query.userId :
        query.userId = res.locals.jwtPayload.id;

    if (req.query.tgId) {
        query._id = new ObjectId(req.query.tgId as string);
    } else {
        return res.status(400).send(Responses.MissingTgId);
    }

    try {

        // Delete group from db
        // await collection.deleteOne(query);
        await collection.findOneAndDelete(query);

        // Delete  points
        // Done by api to decouple this controller from the tp collection
        await flApi.deleteTpsByTgId(query._id);

        return res.send(Responses.Deleted);
    } catch (err) {
        Logger.dbErr(err.message);
        return res.status(500).send(Responses.DatabaseErr);
    }
}
