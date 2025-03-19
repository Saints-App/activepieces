import { User, } from "./dbSchemas";

export const filterOperators = [
    'eq',
    'ne',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'notIlike',
    'isNull',
    'isNotNull'
] as const;

export type FilterOperator = (typeof filterOperators)[number];

export interface FilterCondition {
    field: keyof User;
    operator: FilterOperator;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value?: any;
}
