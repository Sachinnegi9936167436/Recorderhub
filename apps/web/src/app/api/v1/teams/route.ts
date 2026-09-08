import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { TeamModel, UserModel } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await connectToDatabase();
    let teams = await (TeamModel as any).find().sort({ createdAt: -1 }).lean().exec();

    // If no teams exist in DB, check if we should auto-seed the upskill team for Rajdeep
    if (!teams || teams.length === 0) {
      const rajdeepUser = await (UserModel as any).findOne({
        $or: [
          { email: /rajdeep/i },
          { firstName: /rajdeep/i },
          { role: 'TEAM_LEAD' }
        ]
      }).lean().exec();

      // Fetch existing counselors to include active counselors in upskill team
      const counselors = await (UserModel as any).find({ role: { $in: ['COUNSELOR', 'AGENT', 'SALES'] } }).lean().exec();
      const counselorNames = counselors.map((c: any) => `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email).filter(Boolean);

      const defaultTeam = await (TeamModel as any).create({
        name: 'upskill',
        admin: rajdeepUser ? `${rajdeepUser.firstName || 'Rajdeep'} ${rajdeepUser.lastName || ''}`.trim() : 'Rajdeep',
        admins: [
          rajdeepUser ? `${rajdeepUser.firstName || 'Rajdeep'} ${rajdeepUser.lastName || ''}`.trim() : 'Rajdeep',
          'rajdeepa@academically.com',
          'Rajdeep'
        ],
        teamLeadEmail: rajdeepUser?.email || 'rajdeepa@academically.com',
        teamLeadId: rajdeepUser?._id ? rajdeepUser._id.toString() : undefined,
        members: counselorNames.length > 0 ? counselorNames : [
          'Sameer',
          'Sayan',
          'Muskan',
          'Himanshu',
          'Priya',
          'Raja',
          'Gaurav',
          'Shruti',
          'Prakhar',
          'Rahul',
          'Neharika'
        ],
        installedRatio: `${counselorNames.length || 11} / ${counselorNames.length || 11}`,
      });

      teams = [defaultTeam];
    }

    // Format _id as id for frontend compatibility
    const formatted = teams.map((t: any) => ({
      id: t._id ? t._id.toString() : t.id,
      _id: t._id ? t._id.toString() : t.id,
      name: t.name,
      admin: t.admin || 'Rajdeep',
      admins: Array.isArray(t.admins) && t.admins.length > 0 ? t.admins : [t.admin || 'Rajdeep'],
      teamLeadEmail: t.teamLeadEmail,
      teamLeadId: t.teamLeadId,
      members: Array.isArray(t.members) ? t.members : [],
      installedRatio: t.installedRatio || `${(t.members || []).length} / ${(t.members || []).length}`,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('Error fetching teams:', err);
    return NextResponse.json({ message: err.message || 'Error fetching teams' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ message: 'Team name is required' }, { status: 400 });
    }

    const teamName = body.name.trim();
    const admin = (body.admin || 'Rajdeep').trim();
    const admins = Array.isArray(body.admins) && body.admins.length > 0 ? body.admins : [admin];
    const members = Array.isArray(body.members) ? body.members : [];
    const installedRatio = body.installedRatio || `${members.length} / ${members.length}`;

    // Find if user admin exists
    const adminUser = await (UserModel as any).findOne({
      $or: [
        { email: admin.toLowerCase() },
        { firstName: new RegExp(`^${admin}$`, 'i') },
        { email: /rajdeep/i }
      ]
    }).lean().exec();

    const newTeam = await (TeamModel as any).findOneAndUpdate(
      { name: new RegExp(`^${teamName}$`, 'i') },
      {
        $set: {
          name: teamName,
          admin,
          admins,
          members,
          installedRatio,
          teamLeadEmail: adminUser?.email || (admin.includes('@') ? admin : undefined),
          teamLeadId: adminUser?._id ? adminUser._id.toString() : undefined,
        },
      },
      { upsert: true, new: true }
    ).lean().exec();

    return NextResponse.json({
      success: true,
      team: {
        id: newTeam._id ? newTeam._id.toString() : newTeam.id,
        _id: newTeam._id ? newTeam._id.toString() : newTeam.id,
        name: newTeam.name,
        admin: newTeam.admin,
        admins: newTeam.admins,
        members: newTeam.members,
        installedRatio: newTeam.installedRatio,
      }
    });
  } catch (err: any) {
    console.error('Error creating team:', err);
    return NextResponse.json({ message: err.message || 'Error creating team' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, _id, name, admin, admins, members } = body;

    const teamId = id || _id;
    if (!teamId && !name) {
      return NextResponse.json({ message: 'Team ID or name is required' }, { status: 400 });
    }

    const filter = teamId && mongoose.Types.ObjectId.isValid(teamId)
      ? { _id: teamId }
      : { name: new RegExp(`^${name}$`, 'i') };

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (admin) updateData.admin = admin.trim();
    if (Array.isArray(admins)) updateData.admins = admins;
    if (Array.isArray(members)) {
      updateData.members = members;
      updateData.installedRatio = `${members.length} / ${members.length}`;
    }

    const updated = await (TeamModel as any).findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true }
    ).lean().exec();

    if (!updated) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      team: {
        id: updated._id ? updated._id.toString() : updated.id,
        _id: updated._id ? updated._id.toString() : updated.id,
        name: updated.name,
        admin: updated.admin,
        admins: updated.admins,
        members: updated.members,
        installedRatio: updated.installedRatio,
      }
    });
  } catch (err: any) {
    console.error('Error updating team:', err);
    return NextResponse.json({ message: err.message || 'Error updating team' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json({ message: 'Team ID or name is required' }, { status: 400 });
    }

    const filter = id && mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { name: new RegExp(`^${name || id}$`, 'i') };

    await (TeamModel as any).deleteOne(filter);
    return NextResponse.json({ success: true, message: 'Team deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting team:', err);
    return NextResponse.json({ message: err.message || 'Error deleting team' }, { status: 500 });
  }
}
