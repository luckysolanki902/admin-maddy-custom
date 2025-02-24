'use client';


export default function GoalsPage() {
  return (
    <div style={{
      backgroundColor: '#2f2f2f', 
      color: '#FFFF', 
      height: '100vh', 
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '100px', marginBottom: '0' ,color:'#FFFFFF' ,opacity:'20%'}}>Goals</h1>
      <p style={{ marginTop: '0px', marginLeft: '10px', fontSize: '24px', color: '#FF5990', fontWeight: 'lighter' }}>monthly</p>

      <div style={{ marginTop: '50px' }}>
        <label>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <input style={{width: '30px', height: '30px'}} type="checkbox" />
            <span style={{marginLeft: '20px',fontSize:'24px'}}>5 tasks in development</span>
          </div>
        </label>
      </div>
    </div>
  );
}
