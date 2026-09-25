
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const m=$('.menu'),n=$('.navlinks'); if(m&&n){m.onclick=()=>n.classList.toggle('open');$$('.navlinks a').forEach(a=>a.onclick=()=>n.classList.remove('open'));}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.12});$$('.reveal').forEach(x=>io.observe(x));
const y=$('[data-year]');if(y)y.textContent=new Date().getFullYear();
const f=$('#quote-form');if(f)f.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(f);const s=encodeURIComponent('Website enquiry – Parkway Fabrications');const b=encodeURIComponent(`Name: ${d.get('name')||''}\nCompany: ${d.get('company')||''}\nEmail: ${d.get('email')||''}\nPhone: ${d.get('phone')||''}\nService: ${d.get('service')||''}\n\nProject details:\n${d.get('message')||''}`);location.href=`mailto:tony@parkwayfabrications.co.uk?subject=${s}&body=${b}`});
