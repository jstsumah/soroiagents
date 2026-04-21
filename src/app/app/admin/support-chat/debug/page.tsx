
"use client";
import * as React from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugChatPage() {
    const [result, setResult] = React.useState<any>(null);
    const supabase = createClient();

    const runDebug = async () => {
        try {
            const { data: user } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('chat_sessions')
                .select('*, chat_messages(*)')
                .limit(5);
            
            setResult({ user, data, error });
        } catch (e: any) {
            setResult({ error: e.message });
        }
    };

    return (
        <div className="p-10">
            <button onClick={runDebug} className="p-2 bg-blue-500 text-white rounded">Run Debug</button>
            <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
            </pre>
        </div>
    );
}
