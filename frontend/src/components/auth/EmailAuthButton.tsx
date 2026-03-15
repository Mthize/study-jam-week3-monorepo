export function EmailAuthButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn-email-cta" onClick={onClick}>
      Continue with Email
    </button>
  );
}
