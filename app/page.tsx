"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Contact = { id: string; name: string; phone: string };

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setValue(JSON.parse(raw)); } catch {}
  }, [key]);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

function Contacts() {
  const [contacts, setContacts] = useLocalStorage<Contact[]>("contacts", []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const add = () => {
    if (!name.trim() || !phone.trim()) return;
    const id = crypto.randomUUID();
    setContacts([...contacts, { id, name: name.trim(), phone: phone.trim() }]);
    setName("");
    setPhone("");
  };
  const remove = (id: string) => setContacts(contacts.filter(c => c.id !== id));
  return (
    <div className="card stack">
      <h2>긴급 연락처</h2>
      <div className="field">
        <input className="input" placeholder="이름" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="전화번호" value={phone} onChange={e=>setPhone(e.target.value)} />
        <button className="btn" onClick={add}>추가</button>
      </div>
      <ul className="stack">
        {contacts.map(c => (
          <li key={c.id} className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <div><strong>{c.name}</strong></div>
              <div className="muted">{c.phone}</div>
            </div>
            <button className="btn outline" onClick={()=>remove(c.id)}>삭제</button>
          </li>
        ))}
        {contacts.length===0 && <li className="muted">저장된 연락처가 없습니다.</li>}
      </ul>
    </div>
  );
}

type GeoPoint = { lat: number; lng: number; ts: number };

function LocationMonitor() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const start = () => {
    if (!navigator.geolocation) return alert("이 브라우저는 위치를 지원하지 않습니다.");
    const id = navigator.geolocation.watchPosition(
      pos => {
        setAllowed(true);
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() });
      },
      () => {
        setAllowed(false);
        alert("위치 권한이 거부되었거나 오류가 발생했습니다.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    setWatchId(id);
  };
  const stop = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setWatchId(null);
  };
  return (
    <div className="card stack">
      <h2>위치 모니터링</h2>
      <div className="row">
        {watchId===null ? (
          <button className="btn" onClick={start}>시작</button>
        ) : (
          <button className="btn outline" onClick={stop}>중지</button>
        )}
        {position && (
          <a className="btn secondary" href={`https://maps.google.com/?q=${position.lat},${position.lng}`} target="_blank" rel="noreferrer">지도에서 보기</a>
        )}
      </div>
      <div className="muted">권한: {allowed===null?"미요청": allowed?"허용":"거부"}</div>
      {position && (
        <div>
          <div>위도: {position.lat.toFixed(6)} / 경도: {position.lng.toFixed(6)}</div>
          <div className="muted">업데이트: {new Date(position.ts).toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
}

function useQueryParam(name: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    setValue(url.searchParams.get(name));
  }, [name]);
  return value;
}

function CountdownModal({ open, seconds, onCancel, onConfirm }: { open: boolean; seconds: number; onCancel: ()=>void; onConfirm: ()=>void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => { if (open) setLeft(seconds); }, [open, seconds]);
  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => setLeft(prev => prev - 1), 1000);
    return () => clearInterval(iv);
  }, [open]);
  useEffect(() => { if (open && left <= 0) onConfirm(); }, [left, open, onConfirm]);
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal stack">
        <h3>긴급신고 전송 예정</h3>
        <p className="muted">{left}초 후 자동 전송됩니다. 취소하려면 아래 버튼을 누르세요.</p>
        <div className="row">
          <button className="btn warn" onClick={onConfirm}>지금 즉시 전송</button>
          <button className="btn outline" onClick={onCancel}>취소</button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const trigger = useQueryParam("trigger");
  const [open, setOpen] = useState(false);
  useEffect(() => { if (trigger === "alert") setOpen(true); }, [trigger]);
  const confirm = () => { setOpen(false); alert("긴급신고가 전송되었습니다. (연동 API 연결 필요)"); };
  return (
    <div className="container stack">
      <header className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
        <h1>Safety Tracker</h1>
        <div className="row">
          <button className="btn secondary" onClick={()=>setOpen(true)}>카운트다운 시작</button>
          <Link className="btn outline" href="/?trigger=alert">URL 트리거</Link>
        </div>
      </header>
      <div className="row">
        <div className="col"><Contacts /></div>
        <div className="col"><LocationMonitor /></div>
      </div>
      <CountdownModal open={open} seconds={20} onCancel={()=>setOpen(false)} onConfirm={confirm} />
    </div>
  );
}
