
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const m=$('.menu'),n=$('.navlinks'); if(m&&n){m.onclick=()=>n.classList.toggle('open');$$('.navlinks a').forEach(a=>a.onclick=()=>n.classList.remove('open'));}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.12});$$('.reveal').forEach(x=>io.observe(x));
const v=$('.visual');if(v&&matchMedia('(pointer:fine)').matches){const w=v.parentElement;w.addEventListener('pointermove',e=>{const r=w.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;v.style.transform=`rotateY(${x*7-6}deg) rotateX(${-y*5+3}deg)`});w.addEventListener('pointerleave',()=>v.style.transform='rotateY(-7deg) rotateX(3deg)')}
const y=$('[data-year]');if(y)y.textContent=new Date().getFullYear();
const f=$('#quote-form');if(f)f.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(f);const s=encodeURIComponent('Website enquiry – Parkway Fabrications');const b=encodeURIComponent(`Name: ${d.get('name')||''}\nCompany: ${d.get('company')||''}\nEmail: ${d.get('email')||''}\nPhone: ${d.get('phone')||''}\nService: ${d.get('service')||''}\n\nProject details:\n${d.get('message')||''}`);location.href=`mailto:tony@parkwayfabrications.co.uk?subject=${s}&body=${b}`});
