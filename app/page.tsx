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
  const [editingId, setEditingId] = useState<string | null>(null);
  const save = () => {
    if (!name.trim() || !phone.trim()) return;
    if (editingId) {
      setContacts(contacts.map(c => c.id === editingId ? { ...c, name: name.trim(), phone: phone.trim() } : c));
      setEditingId(null);
    } else {
      const id = crypto.randomUUID();
      setContacts([...contacts, { id, name: name.trim(), phone: phone.trim() }]);
    }
    setName("");
    setPhone("");
  };
  const remove = (id: string) => setContacts(contacts.filter(c => c.id !== id));
  const startEdit = (c: Contact) => { setEditingId(c.id); setName(c.name); setPhone(c.phone); };
  return (
    <div className="card stack">
      <h2>긴급 연락처</h2>
      <div className="field">
        <input className="input" placeholder="이름" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="전화번호" value={phone} onChange={e=>setPhone(e.target.value)} />
        <button className="btn" onClick={save}>{editingId?"변경 저장":"추가"}</button>
        {editingId && <button className="btn outline" onClick={()=>{setEditingId(null); setName(""); setPhone("");}}>취소</button>}
      </div>
      <ul className="stack">
        {contacts.map(c => (
          <li key={c.id} className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <div><strong>{c.name}</strong></div>
              <div className="muted">{c.phone}</div>
            </div>
            <div className="row" style={{gap:8}}>
              <button className="btn outline" onClick={()=>startEdit(c)}>수정</button>
              <button className="btn outline" onClick={()=>remove(c.id)}>삭제</button>
            </div>
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
  const [history, setHistory] = useLocalStorage<GeoPoint[]>("geoHistory", []);
  const [targetTime, setTargetTime] = useState<string>(""); // datetime-local 값

  // 위치 업데이트 시 현재 위치 저장 + 히스토리 누적
  const pushHistory = (p: GeoPoint) => {
    const next = [...history, p].slice(-500); // 최근 500개만 보관
    setHistory(next);
  };

  const start = () => {
    if (!navigator.geolocation) return alert("이 브라우저는 위치를 지원하지 않습니다.");
    const id = navigator.geolocation.watchPosition(
      pos => {
        setAllowed(true);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() };
        setPosition(p);
        pushHistory(p);
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

  const clearHistory = () => setHistory([]);

  // 선택 시간에 가장 가까운 위치 찾기
  const displayedPoint: GeoPoint | null = (() => {
    if (targetTime && history.length > 0) {
      const ts = new Date(targetTime).getTime();
      let best: GeoPoint | null = null;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (const h of history) {
        const d = Math.abs(h.ts - ts);
        if (d < bestDiff) { best = h; bestDiff = d; }
      }
      return best;
    }
    return position;
  })();

  const mapSrc = displayedPoint
    ? `https://www.google.com/maps?q=${displayedPoint.lat},${displayedPoint.lng}&z=15&output=embed`
    : "";

  return (
    <div className="card stack">
      <h2>위치 모니터링</h2>
      <div className="row">
        {watchId===null ? (
          <button className="btn" onClick={start}>시작</button>
        ) : (
          <button className="btn outline" onClick={stop}>중지</button>
        )}
        {displayedPoint && (
          <a className="btn secondary" href={`https://maps.google.com/?q=${displayedPoint.lat},${displayedPoint.lng}`} target="_blank" rel="noreferrer">지도에서 보기</a>
        )}
        <button className="btn outline" onClick={clearHistory}>기록 초기화</button>
      </div>
      <div className="row" style={{alignItems:'center'}}>
        <label className="muted">특정 시간 보기</label>
        <input className="input" type="datetime-local" value={targetTime} onChange={e=>setTargetTime(e.target.value)} />
      </div>
      <div className="muted">권한: {allowed===null?"미요청": allowed?"허용":"거부"}</div>
      {displayedPoint && (
        <div className="stack">
          <div>위도: {displayedPoint.lat.toFixed(6)} / 경도: {displayedPoint.lng.toFixed(6)}</div>
          <div className="muted">시각: {new Date(displayedPoint.ts).toLocaleString()}</div>
          <div style={{borderRadius:12, overflow:'hidden', border:'1px solid #e5e7eb'}}>
            <iframe
              src={mapSrc}
              width="100%"
              height="360"
              style={{border:0}}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="location-map"
            />
          </div>
        </div>
      )}
      {!displayedPoint && (
        <div className="muted">아직 위치가 없습니다. 시작을 눌러 위치 모니터링을 켜세요.</div>
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
  const [tab, setTab] = useState<'contacts'|'location'|'device'>("contacts");
  useEffect(() => { if (trigger === "alert") setOpen(true); }, [trigger]);
  const confirm = () => { setOpen(false); alert("긴급신고가 전송되었습니다. (연동 API 연결 필요)"); };
  return (
    <div className="container stack">
      <header className="row" style={{alignItems:'center', justifyContent:'space-between'}}>
        <h1>Safety Tracker</h1>
        <nav className="tabs">
          <button className={`tab ${tab==='contacts'?'active':''}`} onClick={()=>setTab('contacts')}>연락처</button>
          <button className={`tab ${tab==='location'?'active':''}`} onClick={()=>setTab('location')}>위치</button>
          <button className={`tab ${tab==='device'?'active':''}`} onClick={()=>setTab('device')}>기기연결</button>
        </nav>
      </header>
      {tab==='contacts' && (
        <div className="row">
          <div className="col"><Contacts /></div>
        </div>
      )}
      {tab==='location' && (
        <div className="stack">
          <div className="row" style={{justifyContent:'flex-end'}}>
            <button className="btn secondary" onClick={()=>setOpen(true)}>카운트다운 시작</button>
            <Link className="btn outline" href="/?trigger=alert">URL 트리거</Link>
          </div>
          <div className="row">
            <div className="col"><LocationMonitor /></div>
          </div>
        </div>
      )}
      {tab==='device' && (
        <div className="row">
          <div className="col"><DeviceConnect /></div>
        </div>
      )}
      <CountdownModal open={open} seconds={20} onCancel={()=>setOpen(false)} onConfirm={confirm} />
    </div>
  );
}

function DeviceConnect() {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setError(null);
    try {
      if (!navigator.bluetooth) {
        setError("이 브라우저는 Web Bluetooth를 지원하지 않습니다.");
        return;
      }
      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0x180F] }], // Battery Service
        optionalServices: [0x180F]
      });
      setDevice(dev);
      const server = await dev.gatt!.connect();
      const service = await server.getPrimaryService(0x180F);
      const characteristic = await service.getCharacteristic(0x2A19); // Battery Level
      const value = await characteristic.readValue();
      const level = value.getUint8(0);
      setBattery(level);

      // 배터리 레벨 변경 알림 구독 시도
      try {
        await characteristic.startNotifications();
        characteristic.addEventListener("characteristicvaluechanged", (e: Event) => {
          const target = e.target as BluetoothRemoteGATTCharacteristic;
          const v = target.value!.getUint8(0);
          setBattery(v);
        });
      } catch {}

      dev.addEventListener("gattserverdisconnected", () => {
        setError("기기 연결이 해제되었습니다.");
      });
    } catch (e: any) {
      setError(e?.message ?? "연결에 실패했습니다.");
    }
  };

  const disconnect = async () => {
    try {
      device?.gatt?.disconnect();
      setDevice(null);
      setBattery(null);
    } catch {}
  };

  return (
    <div className="card stack">
      <h2>기기 연결</h2>
      <div className="row">
        {device ? (
          <button className="btn outline" onClick={disconnect}>연결 해제</button>
        ) : (
          <button className="btn" onClick={connect}>기기 연결</button>
        )}
      </div>
      {error && <div className="muted">{error}</div>}
      {device && (
        <div className="stack">
          <div>기기명: <strong>{device.name ?? "알 수 없음"}</strong></div>
          <div>배터리: {battery!==null ? `${battery}%` : "읽는 중..."}</div>
        </div>
      )}
      {!device && (
        <div className="muted">버튼을 눌러 블루투스 기기(배터리 서비스)를 선택하세요.</div>
      )}
    </div>
  );
}
