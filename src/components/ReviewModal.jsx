import { useState } from 'react'
import { addReview } from '../lib/firebase'
import toast from 'react-hot-toast'

export default function ReviewModal({ onClose, onSubmitted }) {
  const [rating, setRating]       = useState(0)
  const [hovered, setHovered]     = useState(0)
  const [name, setName]           = useState('')
  const [text, setText]           = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!name.trim())            { toast.error('Please enter your name'); return }
    if (rating === 0)            { toast.error('Please select a star rating'); return }
    if (text.trim().length < 10) { toast.error('Please write at least 10 characters'); return }
    setSubmitting(true)
    try {
      await addReview({ user_name: name.trim(), rating, text: text.trim(), approved: false })
      toast.success('Review submitted! It will appear after approval. 🎉')
      onSubmitted?.()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Failed to submit. Please try again.')
    }
    setSubmitting(false)
  }

  const stars = hovered || rating

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box pop-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>⭐</div>
          <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 22, fontWeight: 900 }}>Write a Review</h3>
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Your review will appear after admin approval.</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="fm-label">Your Name *</label>
          <input className="fm-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kasun Perera" maxLength={50} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label className="fm-label">Rating *</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} type="button"
                onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(s)}
                style={{ background: 'none', border: 'none', fontSize: 38, cursor: 'pointer',
                  transition: 'transform .15s', padding: 0, lineHeight: 1,
                  transform: stars >= s ? 'scale(1.15)' : 'scale(1)',
                  color: stars >= s ? '#f4a322' : '#ddd' }}>★</button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6, fontWeight: 600, height: 18 }}>
            {['','Poor','Fair','Good','Great','Excellent!'][rating]}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="fm-label">Your Review *</label>
          <textarea className="fm-input" rows={4}
            placeholder="Share your experience with Thisara Stores..."
            value={text} onChange={e => setText(e.target.value)}
            maxLength={500} style={{ resize: 'none' }} />
          <div style={{ fontSize: 11, color: text.length > 450 ? '#e63946' : '#aaa', textAlign: 'right', marginTop: 4 }}>
            {text.length}/500
          </div>
        </div>
        <button onClick={submit} disabled={submitting} style={{
          width: '100%', background: submitting ? '#ccc' : '#1e6641', color: '#fff',
          padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 15,
          border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
          fontFamily: "'Nunito',sans-serif",
        }}>
          {submitting ? '⏳ Submitting...' : '✅ Submit Review'}
        </button>
      </div>
    </div>
  )
}
