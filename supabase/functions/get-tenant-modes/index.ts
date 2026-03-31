import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenantModesResponse {
  tenantId: string;
  activeModes: string[];
  lockedModes: string[];
  maxAllowedModes: number;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get userId from query params
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's profile to find tenant_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ 
        error: 'Profile not found',
        tenantId: userId,
        activeModes: ['mess'],
        lockedModes: ['restaurant', 'canteen'],
        maxAllowedModes: 1
      } as TenantModesResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tenant mode access from mode_activation schema
    const { data: modeAccess, error: modeError } = await supabase
      .from('mode_activation.tenant_mode_access')
      .select('active_modes, max_allowed_modes')
      .eq('tenant_id', profile.id)
      .single();

    // Define all available modes
    const allModes = ['mess', 'restaurant', 'canteen'];
    const activeModes = modeAccess?.active_modes || ['mess'];
    const lockedModes = allModes.filter(mode => !activeModes.includes(mode));
    const maxAllowedModes = modeAccess?.max_allowed_modes || 1;

    const response: TenantModesResponse = {
      tenantId: profile.id,
      activeModes,
      lockedModes,
      maxAllowedModes,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Get tenant modes error:", error);

    // Return default modes on error
    const fallbackResponse: TenantModesResponse = {
      tenantId: '',
      activeModes: ['mess'],
      lockedModes: ['restaurant', 'canteen'],
      maxAllowedModes: 1,
    };

    return new Response(JSON.stringify(fallbackResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
