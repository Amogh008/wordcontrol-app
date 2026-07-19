import { notesApiClient } from './notesApiClient';

export async function getNotes() {
  const { data } = await notesApiClient.get('/');
  return data;
}

export async function addNote({ title, content }) {
  const { data } = await notesApiClient.post('/', { title, content });
  return data;
}

export async function updateNote(id, { title, content }) {
  const { data } = await notesApiClient.put(`/${id}`, { title, content });
  return data;
}

export async function deleteNote(id) {
  await notesApiClient.delete(`/${id}`);
}

export async function clearNotes() {
  await notesApiClient.delete('/');
}

export async function formatNoteContent(content) {
  const { data } = await notesApiClient.post('/format', { content });
  return data.content;
}
