interface PhoneProps {
  src: string;
  alt: string;
}

export function Phone({ src, alt }: PhoneProps) {
  return (
    <div className="phone" aria-hidden="false">
      <div className="phone__notch" />
      <div className="phone__screen">
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}
