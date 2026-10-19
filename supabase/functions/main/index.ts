import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  let functionName = pathParts[0];
  if (pathParts[0] === 'functions' && pathParts[1] === 'v1') {
    functionName = pathParts[2];
  }
  
  if (!functionName || functionName === 'main' || functionName === 'main-founders_campus') {
    return new Response("Founders Campus edge-runtime router OK", { status: 200 });
  }

  // If function does not have suffix -founders_campus, resolve to -founders_campus if available
  if (!functionName.endsWith("-founders_campus")) {
    try {
      await Deno.stat(`/home/deno/functions/${functionName}-founders_campus`);
      functionName = `${functionName}-founders_campus`;
    } catch {
      // Keep original name if suffixed doesn't exist
    }
  }

  try {
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath: `/home/deno/functions/${functionName}`,
      memoryLimitMb: 256,
      workerTimeoutMs: 5 * 60 * 1000,
      cpuTimeSoftLimitMs: 5 * 60 * 1000,
      cpuTimeHardLimitMs: 5 * 60 * 1000,
      wallClockTimeLimitMs: 5 * 60 * 1000,
      noModuleCache: false,
      importMapPath: null,
      envVars: Object.entries(Deno.env.toObject())
    });
    
    return await worker.fetch(req);
  } catch (e) {
    console.error(`Error loading function ${functionName}:`, e);
    return new Response(JSON.stringify({ error: `Function ${functionName} not found or failed to start: ${e.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
