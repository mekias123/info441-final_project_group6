import { useState } from 'react';

export default function PostJob() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    budget: '',
  });
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      const res = await fetch('http://localhost:3001/api/project/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          budget: Number(form.budget),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Something went wrong.' });
        return;
      }

      setMessage({ type: 'success', text: `Job "${data.title}" posted successfully!` });
      setForm({ title: '', description: '', deadline: '', budget: '' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to connect to server.' });
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h2>Post an Editing Job</h2>

      {message && (
        <p style={{ color: message.type === 'error' ? 'red' : 'green' }}>
          {message.text}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>
          Title
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <label>
          Deadline
          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <label>
          Budget ($)
          <input
            type="number"
            name="budget"
            value={form.budget}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>

        <button type="submit" style={{ padding: '0.75rem', marginTop: '0.5rem', cursor: 'pointer' }}>
          Post Job
        </button>
      </form>
    </div>
  );
}
