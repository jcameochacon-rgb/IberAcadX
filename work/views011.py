from pathlib import Path
import re
A=Path('apps/web/src/app');C=Path('apps/web/src/components')
p=A/'panel/gestion/[seccion]/page.tsx';s=p.read_text();s='import {CrudHeading} from "@/components/crud-heading";\nimport {readAction} from "@/lib/workspace-navigation";\n'+s
s=s.replace('const query = await searchParams;','const query = await searchParams;\n  const mode=readAction(query.accion,query.id?"editar":"consultar");')
s=s.replace('const editing = Boolean(id) || textParam(query.nuevo) === "1";','const editing = mode!=="consultar" && (Boolean(id) || textParam(query.nuevo) === "1");')
a=s.index('      <div className="mb-7',s.index('  const Icon ='));b=s.index('\n      {textParam(query.guardado)',a)
s=s[:a]+'''      {(seccion==="estudiantes"||seccion==="docentes")?<CrudHeading module={seccion} action={mode}/>:<h1 className="mb-6 text-3xl font-semibold">{managementLabels[seccion]}</h1>}
      {editing&&<Link className="mb-5 inline-block text-blue-700" href={`${base}?accion=${mode}`}>Volver a la selección</Link>}
'''+s[b:]
s=s.replace('href={`${base}?id=${row.id}`}','href={`${base}?accion=${mode==="consultar"?"editar":mode}&id=${row.id}`}').replace('aria-label={`Editar ${String(Object.values(row.cells)[0])}`}','aria-label={`Seleccionar ${String(Object.values(row.cells)[0])}`}')
s=s.replace('<Pencil size={14} />\n                        Editar','<Pencil size={14} />\n                        {mode==="eliminar"?"Seleccionar para eliminar":"Editar"}')
s=s.replace('<td className="px-5 py-4">\n                      <Link','<td className="px-5 py-4">\n                      {mode!=="consultar"&&<Link').replace('                        {mode==="eliminar"?"Seleccionar para eliminar":"Editar"}\n                      </Link>','                        {mode==="eliminar"?"Seleccionar para eliminar":"Editar"}\n                      </Link>}')
s=s.replace('{editing && (','{editing && mode!=="eliminar" && (').replace('{relations && (','{relations && mode==="editar" && (').replace('{id&&<OperationForm','{id&&mode==="eliminar"&&<OperationForm')
s=s.replace('?pagina=${page - 1}', '?accion=${mode}&pagina=${page - 1}').replace('?pagina=${page + 1}', '?accion=${mode}&pagina=${page + 1}')
# Persist requested action through GET search forms.
s=re.sub(r'(<form\b[\s\S]*?method="get"[\s\S]*?>)',r'\1<input type="hidden" name="accion" value={mode}/>',s)
p.write_text(s)
# Separate delete pages entirely from capture workflows.
for module in ['asistencia','calificaciones']:
 p=A/f'panel/{module}/registro/page.tsx';s=p.read_text();s='import {CrudHeading} from "@/components/crud-heading";\nimport {readAction} from "@/lib/workspace-navigation";\n'+s
 marker='  const params = await searchParams;' if module=='asistencia' else '  const p = await searchParams,'
 if module=='asistencia':s=s.replace(marker,marker+f'\n  const mode=readAction(params.accion,"registrar");\n  if(mode==="eliminar")return <PanelShell model={{model}} current="{module}"><CrudHeading module="{module}" action="eliminar"/><AcademicDelete model={{model}} tipo="{module}"/></PanelShell>;')
 else:s=s.replace(marker,'  const p = await searchParams;\n  const mode=readAction(p.accion,"registrar");\n  if(mode==="eliminar")return <PanelShell model={model} current="calificaciones"><CrudHeading module="calificaciones" action="eliminar"/><AcademicDelete model={model} tipo="calificaciones"/></PanelShell>;\n  const')
 # Replace top title area on successful branch.
 a=s.index('      <div className="mb-7',s.index('const messages'));b=s.index('\n      <Card',a);s=s[:a]+f'      <CrudHeading module="{module}" action={{mode}}/>'+s[b:]
 s=s.replace(f'      <AcademicDelete model={{model}} tipo="{module}"/>','')
 s=re.sub(r'(<form\b[\s\S]*?method="get"[\s\S]*?>)',r'\1<input type="hidden" name="accion" value={mode}/>',s)
 p.write_text(s)
# Schedule views: capture / select to edit / select to delete / read-only.
p=A/'panel/horarios/semana/page.tsx';s=p.read_text();s='import {CrudHeading} from "@/components/crud-heading";\nimport {readAction} from "@/lib/workspace-navigation";\n'+s;s=s.replace('  const course =','  const mode=readAction(params.accion);\n  const course =').replace('manage = canManage(profile.rol);','manage = canManage(profile.rol) && mode!=="consultar";')
a=s.index('      <div className="mb-7');b=s.index('\n      <Card',a);s=s[:a]+'      <CrudHeading module="horarios" action={mode}/>'+s[b:]
s=s.replace('href={`/panel/horarios/semana?curso=${course}&bloque=${h.id}#editar-bloque`}','href={`/panel/horarios/semana?accion=${mode}&curso=${course}&bloque=${h.id}#editar-bloque`}').replace('Editar bloque\n','{mode==="eliminar"?"Seleccionar para eliminar":"Editar bloque"}\n')
s=s.replace('{id ? "Editar bloque" : "Nuevo bloque"}','{mode==="eliminar"?"Eliminar bloque":id?"Editar bloque":"Nuevo bloque"}')
s=s.replace('                    <ScheduleForm','                    {mode!=="eliminar"&&(mode==="registrar"||block)&&<ScheduleForm').replace('                      block={block}\n                    />','                      block={block}\n                    />}').replace('{block && (','{block && mode==="eliminar" && (')
s=s.replace('              <Card id="editar-bloque"','              {((mode==="registrar")||block)&&<Card id="editar-bloque"').replace('              </Card>\n            </>','              </Card>}\n            </>')
s=re.sub(r'(<form\b[\s\S]*?method="get"[\s\S]*?>)',r'\1<input type="hidden" name="accion" value={mode}/>',s);p.write_text(s)
# Query modules use the exact use-case heading.
p=C/'module-page.tsx';s=p.read_text();s='import {titles} from "@/lib/workspace-navigation";\n'+s;s=s.replace('{listing.title}','{module==="cursos"?listing.title:titles[module]}');p.write_text(s)
