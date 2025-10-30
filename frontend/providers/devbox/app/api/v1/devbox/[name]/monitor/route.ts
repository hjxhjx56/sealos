import { NextRequest, NextResponse } from 'next/server';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { MonitorQuerySchema } from './schema';

export const dynamic = 'force-dynamic';

async function getDevboxPodName(
  k8sCore: any,
  namespace: string,
  devboxName: string
): Promise<string> {
  try {
    const podsResponse = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/name=${devboxName}`
    );
    
    const pods = podsResponse.body.items;
    if (pods.length > 0) {
      return pods[0].metadata?.name || devboxName;
    }
    return devboxName;
  } catch (error) {
    return devboxName;
  }
}

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;
    
    if (!devboxName) {
      return NextResponse.json([]);
    }

    const headerList = req.headers;
    const { searchParams } = req.nextUrl;
    
    const queryParams = {
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      step: searchParams.get('step') || undefined
    };
    
    const validationResult = MonitorQuerySchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return NextResponse.json([]);
    }
    
    const endTime = validationResult.data.end ? Number(validationResult.data.end) : Date.now();
    const startTime = validationResult.data.start ? Number(validationResult.data.start) : endTime - 3 * 60 * 60 * 1000;
    const step = validationResult.data.step || '2m';
    
    const kubeconfig = await authSession(headerList);
    const { namespace, k8sCore } = await getK8s({ kubeconfig });
    
    const queryName = await getDevboxPodName(k8sCore, namespace, devboxName);
    const authorization = headerList.get('Authorization');
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    
    const fetchMonitorData = async (queryKey: string) => {
      try {
        const url = new URL(`${baseUrl}/api/monitor/getMonitorData`);
        url.searchParams.set('queryName', queryName);
        url.searchParams.set('queryKey', queryKey);
        url.searchParams.set('start', String(startTime));
        url.searchParams.set('end', String(endTime));
        url.searchParams.set('step', step);
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': authorization || ''
          }
        });
        
        if (!response.ok) {
          return null;
        }
        
        const result = await response.json();
        
        if (result.code && result.code !== 200) {
          return null;
        }
        
        return result.data;
      } catch (error) {
        return null;
      }
    };
    
    const [cpuData, memoryData] = await Promise.all([
      fetchMonitorData('cpu'),
      fetchMonitorData('memory')
    ]);
    
    const cpu = cpuData && cpuData.length > 0 ? {
      name: cpuData[0].name || '',
      xData: cpuData[0].xData || [],
      yData: cpuData[0].yData || []
    } : {
      name: '',
      xData: [],
      yData: []
    };
    
    const memory = memoryData && memoryData.length > 0 ? {
      name: memoryData[0].name || '',
      xData: memoryData[0].xData || [],
      yData: memoryData[0].yData || []
    } : {
      name: '',
      xData: [],
      yData: []
    };
    
    return NextResponse.json([
      { type: 'cpu', ...cpu },
      { type: 'memory', ...memory }
    ]);
    
  } catch (err) {
    return NextResponse.json([]);
  }
}

