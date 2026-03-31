// pages/api/modes/get-tenant-access.ts
// GET TENANT MODE ACCESS - Load which modes user has access to

import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

type ResponseData = {
  tenantId?: string;
  activeModes?: string[];
  lockedModes?: string[];
  maxAllowedModes?: number;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createServerSupabaseClient({ req, res });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get tenant mode access
    const { data: tenantData, error: tenantError } = await supabase
      .from("mode_activation.tenant_mode_access")
      .select("id, active_modes, max_allowed_modes")
      .eq("manager_id", user.id)
      .single();

    if (tenantError || !tenantData) {
      // Create default tenant access (Mess only)
      const { data: newTenant, error: createError } = await supabase
        .from("mode_activation.tenant_mode_access")
        .insert([
          {
            tenant_id: user.id,
            manager_id: user.id,
            active_modes: ["mess"],
            max_allowed_modes: 1,
          },
        ])
        .select()
        .single();

      if (createError || !newTenant) {
        return res
          .status(500)
          .json({ error: "Failed to create tenant access" });
      }

      return res.status(200).json({
        tenantId: newTenant.id,
        activeModes: newTenant.active_modes,
        lockedModes: ["restaurant", "canteen"],
        maxAllowedModes: newTenant.max_allowed_modes,
      });
    }

    // Get locked modes
    const { data: lockedModesData } = await supabase
      .from("mode_activation.locked_modes")
      .select("mode_name")
      .eq("tenant_id", tenantData.id)
      .eq("is_locked", true);

    const lockedModes = lockedModesData?.map((m) => m.mode_name) || [];

    return res.status(200).json({
      tenantId: tenantData.id,
      activeModes: tenantData.active_modes,
      lockedModes: lockedModes,
      maxAllowedModes: tenantData.max_allowed_modes,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================================================
// pages/api/modes/request-upgrade.ts
// REQUEST UPGRADE - Create upgrade request for a locked mode
// ============================================================================

/*
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

interface UpgradeRequestBody {
  tenantId: string;
  requestedMode: string; // 'restaurant' or 'canteen'
}

type ResponseData = {
  requestId?: string;
  paymentUrl?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tenantId, requestedMode } = req.body as UpgradeRequestBody;

  const supabase = createServerSupabaseClient({ req, res });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify tenant belongs to user
    const { data: tenant, error: tenantError } = await supabase
      .from("mode_activation.tenant_mode_access")
      .select("id")
      .eq("id", tenantId)
      .eq("manager_id", user.id)
      .single();

    if (tenantError || !tenant) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Get pricing for requested mode
    const pricing = requestedMode === "restaurant" ? 49.99 : 39.99;

    // Create upgrade request
    const { data: request, error: requestError } = await supabase
      .from("mode_activation.mode_upgrade_requests")
      .insert([
        {
          tenant_id: tenantId,
          requested_mode: requestedMode,
          request_status: "payment_pending",
          payment_required: pricing,
          payment_status: "unpaid",
        },
      ])
      .select()
      .single();

    if (requestError || !request) {
      return res.status(500).json({ error: "Failed to create upgrade request" });
    }

    // TODO: Integrate with payment gateway (Stripe/PayPal)
    // For now, return mock payment URL
    const paymentUrl = `/checkout?requestId=${request.id}&mode=${requestedMode}&price=${pricing}`;

    return res.status(200).json({
      requestId: request.id,
      paymentUrl: paymentUrl,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
*/

// ============================================================================
// pages/api/modes/activate.ts
// ACTIVATE MODE - Complete upgrade and activate mode
// ============================================================================

/*
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

interface ActivateModeBody {
  tenantId: string;
  mode: string; // 'restaurant' or 'canteen'
  paymentId: string; // Payment processor ID
}

type ResponseData = {
  success?: boolean;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tenantId, mode, paymentId } = req.body as ActivateModeBody;

  const supabase = createServerSupabaseClient({ req, res });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify payment (TODO: Call payment processor API)

    // Activate mode using database function
    const { error } = await supabase.rpc(
      "mode_activation.activate_mode",
      {
        p_tenant_id: tenantId,
        p_mode: mode,
      }
    );

    if (error) {
      return res.status(500).json({ error: "Failed to activate mode" });
    }

    // Update upgrade request status
    await supabase
      .from("mode_activation.mode_upgrade_requests")
      .update({
        request_status: "completed",
        payment_status: "paid",
        completed_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("requested_mode", mode);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
*/
