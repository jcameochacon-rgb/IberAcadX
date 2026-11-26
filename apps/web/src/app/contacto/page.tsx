
import {ArrowUpRight,MapPin,Phone} from "lucide-react";
import {school} from "@/lib/school";
import {PublicNav} from "@/components/public-nav";
export const metadata={title:"Contacto y ubicación"};
export default function Page(){return <><PublicNav/><main><h1 className="mx-auto max-w-7xl px-6 pt-16 text-4xl font-semibold">Contacto y ubicación</h1><section
            
            id="contacto"
            className="mx-auto grid max-w-7xl scroll-mt-8 gap-10 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-2"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#586b80]">
                Ubicación y contacto
              </p>
              <h2 className="mt-5 text-4xl font-medium tracking-tight">
                Estamos en El Alto.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[#586b80]">
                Para consultas de inscripción o atención, confirma directamente
                con la institución la vigencia de estos datos publicados en el
                directorio.
              </p>
            </div>
            <div className="rounded-2xl border border-[#102e57]/15 bg-white p-6 sm:p-8">
              <div className="flex gap-4">
                <MapPin aria-hidden="true" className="shrink-0" />
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#586b80]">
                    Dirección publicada
                  </h3>
                  <p className="mt-2 text-lg font-medium">{school.address}</p>
                  <p className="mt-1 text-sm text-[#586b80]">
                    El Alto, La Paz, Bolivia
                  </p>
                  <a
                    href={school.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
                  >
                    Buscar la dirección en Maps{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <div className="mt-6 flex gap-4 border-t border-[#102e57]/10 pt-6">
                <Phone aria-hidden="true" className="shrink-0" />
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#586b80]">
                    Teléfono publicado
                  </h3>
                  <a
                    className="mt-2 inline-block text-2xl font-medium hover:underline"
                    href={`tel:+591${school.phone}`}
                  >
                    {school.phone}
                  </a>
                  <p className="mt-2 text-xs text-[#586b80]">
                    No verificado directamente con el colegio.
                  </p>
                </div>
              </div>
            </div>
          </section><div className="mx-auto max-w-7xl px-6 pb-20"><iframe title="Ubicación de la Unidad Educativa Iberdrola" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1760.1110592138716!2d-68.19010401041183!3d-16.592206156533436!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915ed8e22c2f0f37%3A0xb3afc238749ed936!2sUnidad%20Educativa%20Iberdrola%2C%20El%20Alto!5e0!3m2!1ses!2sbo!4v1795480647407!5m2!1ses!2sbo" width="600" height="450" style={{border:0,width:"100%",borderRadius:24}} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div></main></>}