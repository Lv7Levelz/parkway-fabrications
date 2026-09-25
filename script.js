
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const menu=$('.menu'),nav=$('.navlinks');
if(menu&&nav){menu.addEventListener('click',()=>nav.classList.toggle('open'));$$('.navlinks a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));}
const y=$('[data-year]');if(y)y.textContent=new Date().getFullYear();
const f=$('#quote-form');if(f){f.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(f);const subject=encodeURIComponent(`Parkway Fabrications enquiry — ${d.get('service')||'Project'}`);const body=encodeURIComponent(`Name: ${d.get('name')||''}\nCompany: ${d.get('company')||''}\nEmail: ${d.get('email')||''}\nPhone: ${d.get('phone')||''}\nService: ${d.get('service')||''}\n\nProject details:\n${d.get('message')||''}`);window.location.href=`mailto:sales@parkwayfabrications.co.uk?subject=${subject}&body=${body}`;});}
