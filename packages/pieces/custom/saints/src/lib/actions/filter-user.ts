import { createAction, Property } from '@activepieces/pieces-framework';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, eq, ne, gt, gte, lt, lte, like, ilike, notIlike, inArray, notInArray, between, notBetween, isNull, isNotNull, InferSelectModel } from 'drizzle-orm';
import { pgClient } from '../common';
import { postgresAuth } from '../..';
import { User, users } from '../dbSchemas';
import { FilterCondition } from '../utils';

async function fetchUsers(db: NodePgDatabase, page: number, pageSize: number, filters: FilterCondition[]): Promise<User[]> {
  const offset = (page - 1) * pageSize;

  const conditions = filters.map((filter) => {
    const column = users[filter.field];
    switch (filter.operator) {
      case 'eq':
        return eq(column, filter.value);
      case 'ne':
        return ne(column, filter.value);
      case 'gt':
        return gt(column, filter.value);
      case 'gte':
        return gte(column, filter.value);
      case 'lt':
        return lt(column, filter.value);
      case 'lte':
        return lte(column, filter.value);
      case 'like':
        return like(column, `%${filter.value}%`);
      case 'ilike':
        return ilike(column, `%${filter.value}%`);
      case 'notIlike':
        return notIlike(column, `%${filter.value}%`);
      case 'isNull':
        return isNull(column);
      case 'isNotNull':
        return isNotNull(column);
      default:
        throw new Error(`Unsupported operator: ${filter.operator}`);
    }
  });

  const query = db
    .select()
    .from(users)
    .where(and(...conditions))
    .orderBy(asc(users.id))
    .limit(pageSize)
    .offset(offset)

  return await query;
}

export const filterUser = createAction({
  auth: postgresAuth,
  name: 'filter-user',
  displayName: 'Filter users',
  description: 'Filter users with pagination',
  props: {
    page: Property.Number({
      displayName: 'Page',
      required: true,
      description: 'Page number for the filter (starts at 1)',
      defaultValue: 1,
    }),
    usersPerPage: Property.Number({
      displayName: 'Users per page',
      required: true,
      description: 'Number of users per page',
      defaultValue: 100,
    }),
    filters: Property.Array({
      displayName: 'Filters',
      required: false,
      description: 'Array of filter conditions. The type is: `{ column: string; operator: string; value: any}[]`',
      defaultValue: [],
    }),
  },
  async run(context) {
    const { page, usersPerPage, filters } = context.propsValue;
    const client = await pgClient(context.auth);
    const db = drizzle(client)
    const users = await fetchUsers(db, page, usersPerPage, filters as FilterCondition[]);
    return { users, numberOfUsers: users.length, nextPage: page + 1 }
  },
});