import { Request, Response, Router } from 'express';
import { Logger, Misc } from '@jamestiberiuskirk/fl-shared';
import { Collections, DbClient } from '../clients/db';
import { Collection, ObjectId } from 'mongodb';
import { Responses } from './Responses';
import { TrackingGroup } from '../models/TrackingData';

/**
 * Creates Express Router object for tracking groups.
 */
export function TrackingGroup(): Router {
    const router: Router = Router();
    router.get('/', GetTrackingGroups);
    router.post('/start', StartTrackingGroup);
    router.post('/stop', StopTrackingGroup);
    router.put('/', UpdateTrackingGroups);
    router.delete('/', DeleteTrackingGroups);
    return router;
}

/**
 * TODO: needs to be finished.
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

    if (req.query.tgId) query._id = req.query.tgId;
    if (req.query.notes) query.notes = req.query.notes;

    try {
        const results = await collection.find(query).toArray();
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
        startTime: Misc.GenTimeStamp(),
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
    update.endTime = Misc.GenTimeStamp();

    if (req.query.tgId) {
        query._id = req.query.tgId;
    } else {
        return res.status(400).send(Responses.MissingTgId);
    }

    try {
        await collection.findOneAndUpdate(query, update);
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

    if (req.body.tg_id) {
        query._id = req.body.tg_id;
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
 * Body:
 *  - tgIds[] : array of tgIds
 *
 * @param req Express Request object.
 * @param res Express Response object.
 */
async function DeleteTrackingGroups(req: Request, res: Response) {
    const db: DbClient = res.locals.db;
    const collection: Collection =
        db.getCollection(Collections.TrackingGroups);
    const query: { [k: string]: any } = {};

    const roles = res.locals.jwtPayload.roles;
    roles[0] === 'microservices' ?
        query.userId = req.query.userId :
        query.userId = res.locals.jwtPayload.id;


    /**
     * TODO: remove all tracking points associated to this tg.
     */

    if (req.body.tgIds) {
        query._id = { $in: req.body.tgIds };
    } else {
        return res.status(400).send(Responses.MissingTgId);
    }

    try {
        await collection.deleteMany(query);
        return res.send(Responses.Deleted);
    } catch (err) {
        Logger.dbErr(err.message);
        return res.status(500).send(Responses.DatabaseErr);
    }
}