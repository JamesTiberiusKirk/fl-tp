export interface SingleValue {
    value: string;
    // valueType: string;
}

export interface TpSet {
    reps: string;
    value: string;
    // valueType: string;
    isDropset: boolean;
    setNr: number;
}

export interface TrackingPoint {
    userId: string;
    tpTypeId: string;
    tgId: string;
    notes: string;
    data: TpSet[] | SingleValue;
    tpNr: number;
}

export interface TrackingGroup {
    userId: string;
    startTime: number;
    endTime: number | undefined;
    notes: string;
}