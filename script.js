const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const menu=$('.menu'),nav=$('.navlinks');
if(menu&&nav){menu.setAttribute('aria-expanded','false');menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});$$('.navlinks a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}));}
const y=$('[data-year]');if(y)y.textContent=new Date().getFullYear();
const f=$('#quote-form');
if(f){
  const requested=new URLSearchParams(location.search).get('service'),service=$('[name="service"]',f);
  if(requested&&service){const option=[...service.options].find(o=>o.text.toLowerCase()===requested.toLowerCase());if(option)service.value=option.value;}
  f.addEventListener('submit',e=>{
    e.preventDefault();
    const d=new FormData(f),file=d.get('drawing');
    const fileNote=file&&file.name?`\nDrawing selected: ${file.name} (please attach this file to the email)`:'\nDrawing: none selected';
    const subject=encodeURIComponent(`Parkway Fabrications enquiry — ${d.get('service')||'Project'}`);
    const body=encodeURIComponent(`Name: ${d.get('name')||''}\nCompany: ${d.get('company')||''}\nEmail: ${d.get('email')||''}\nPhone: ${d.get('phone')||''}\nService: ${d.get('service')||''}${fileNote}\n\nProject details:\n${d.get('message')||''}`);
    window.location.href=`mailto:sales@parkwayfabrications.co.uk?subject=${subject}&body=${body}`;
  });
}
