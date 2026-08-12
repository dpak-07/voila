import { useEffect, useState } from 'react';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/items')
      .then((res) => res.json())
      .then(setItems)
      .catch((error) => {
        console.error('Failed to load backend data:', error);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Voila Sample Frontend</h1>
      </header>
      <section>
        <p>Sample data from the backend API:</p>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>: {item.description}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
