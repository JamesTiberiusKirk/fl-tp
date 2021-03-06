export enum Responses {
    Added = 'Added',
    Updated = 'Updated',
    Deleted = 'Deleted',
    MissingUserId = 'Missing user id',
    MissingTpType = 'Missing tracking group type',
    MissingTpId = 'Missing tracking point id',
    DatabaseErr = 'Database error',
    MissingTgId = 'Missing tracking group Id',
    UserAlreadyStartedGroup = 'User already has started a group',
    NothingToUpdate = 'Nothing to update',
    TypeNotASet = 'Type not a set',
    TpDoesNotExist = 'Tracking point doesnt exist'
}