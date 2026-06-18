import { useEffect, useState } from 'react';

export default function App() {
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => {
        if (!data.connected) {
          console.error('Не удалось подключиться к базе данных');
        }
        setConnected(data.connected);
      })
      .catch((err) => {
        console.error('Ошибка запроса к серверу:', err);
        setConnected(false);
      });
  }, []);

  return (
    <div>
      {connected === true && <p>Подключено успешно</p>}
    </div>
  );
}
