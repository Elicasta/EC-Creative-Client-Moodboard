import { NextRequest, NextResponse } from 'next/server';
import { getProjects, updateProject } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const projects = await getProjects(100);
    return NextResponse.json({ projects });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const project = await updateProject(id, updates);
    return NextResponse.json({ project });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
