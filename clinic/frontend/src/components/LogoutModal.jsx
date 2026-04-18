export default function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Confirm Logout</h2>
        <p>Are you sure you want to logout? You will be redirected to the login page.</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>No, stay</button>
          <button className="btn-danger" onClick={onConfirm}>Yes, logout</button>
        </div>
      </div>
    </div>
  )
}
