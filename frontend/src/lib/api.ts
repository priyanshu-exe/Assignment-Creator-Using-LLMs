const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchAssignments() {
  const res = await fetch(`${API_URL}/assignments`);
  if (!res.ok) throw new Error('Failed to fetch assignments');
  return res.json();
}

export async function fetchAssignment(id: string) {
  const res = await fetch(`${API_URL}/assignments/${id}`);
  if (!res.ok) throw new Error('Failed to fetch assignment');
  return res.json();
}

export async function createAssignment(data: any) {
  const res = await fetch(`${API_URL}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create assignment');
  }
  return res.json();
}

export async function deleteAssignment(id: string) {
  const res = await fetch(`${API_URL}/assignments/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete assignment');
  return res.json();
}

export async function regenerateAssignment(id: string) {
  const res = await fetch(`${API_URL}/assignments/${id}/regenerate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to regenerate');
  return res.json();
}
