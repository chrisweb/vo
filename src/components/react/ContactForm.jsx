import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // In a real app, you'd make an API call here
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ 
        padding: '2rem',
        backgroundColor: '#ecfdf5',
        borderRadius: '0.5rem',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#047857' }}>Thank you for your message!</h2>
        <p>We'll get back to you soon.</p>
        <button 
          onClick={() => {
            setFormData({ name: '', email: '', message: '' });
            setSubmitted(false);
          }}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1.5rem',
      borderRadius: '0.5rem',
      backgroundColor: '#f8fafc',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ marginTop: 0, color: '#4f46e5' }}>Contact Us</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="name"
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #cbd5e1'
            }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="email"
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #cbd5e1'
            }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="message"
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows="4"
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #cbd5e1'
            }}
          ></textarea>
        </div>
        <button 
          type="submit"
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Send Message
        </button>
      </form>
    </div>
  );
}