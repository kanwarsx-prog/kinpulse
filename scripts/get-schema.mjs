import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gjmtypasrgiiyqtamkei.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqbXR5cGFzcmdpaXlxdGFta2VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQyNDA3MCwiZXhwIjoyMDgyMDAwMDcwfQ._KtX3oIK62vf8D3SU5faaRjioMBuU4VsczwbYHErSPM';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' },
    auth: { persistSession: false }
});

const tables = [
    'profiles', 'families', 'pulses', 'messages', 'events',
    'rituals', 'reactions', 'vault_items', 'push_subscriptions',
    'pulse_requests', 'family_invitations'
];

async function getFullSchema() {
    console.log('# KinPulse Database Schema\n');
    console.log('Connected to:', supabaseUrl);
    console.log('\n---\n');

    for (const tableName of tables) {
        try {
            // Get sample row to infer schema
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`\n## ❌ ${tableName}`);
                console.log(`Error: ${error.message}\n`);
                continue;
            }

            console.log(`\n## ✅ ${tableName}`);

            if (data && data.length > 0) {
                const columns = Object.keys(data[0]);
                console.log(`**Columns (${columns.length}):**`);
                columns.forEach(col => {
                    const value = data[0][col];
                    const type = typeof value === 'object' && value !== null ? 'JSON' : typeof value;
                    console.log(`  - \`${col}\` (${type})`);
                });
            } else {
                // Table exists but is empty, try to get count
                const { count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                console.log(`**Status:** Empty table (0 rows)`);
            }

        } catch (err) {
            console.log(`\n## ⚠️  ${tableName}`);
            console.log(`Error: ${err.message}\n`);
        }
    }

    console.log('\n---\n');
    console.log('## Summary');
    console.log('Schema inspection complete!');
}

getFullSchema().catch(console.error);
