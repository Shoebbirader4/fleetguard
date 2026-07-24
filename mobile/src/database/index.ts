import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import migrations from './migrations';
import * as models from './models';

// Create adapter with SQLite
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true, // Use JSI for better performance (requires Hermes)
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

// Create database instance
export const database = new Database({
  adapter,
  modelClasses: [
    models.Vehicle,
    models.WorkOrder,
    models.Inspection,
    models.Alert,
    models.Component,
    models.InspectionChecklist,
  ],
});

export default database;
