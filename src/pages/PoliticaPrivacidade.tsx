import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Shield } from "lucide-react";

const PoliticaPrivacidade = () => (
  <main className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" />
        Voltar para login
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
      </div>

      <p className="text-muted-foreground mb-8">Última atualização: {new Date().getFullYear()}</p>

      <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Compromisso com a Privacidade</h2>
          <p>O Kareon leva a sério a privacidade dos seus dados. Esta política explica como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Dados Coletados</h2>
          <p>Coletamos dados pessoais (nome, email, telefone) e dados clínicos (prontuários, registros de sessões, evolução de pacientes) necessários para o funcionamento da plataforma.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Finalidade do Tratamento</h2>
          <p>Os dados são utilizados para permitir o acesso à plataforma, gestão de clínicas, registro terapêutico, geração de relatórios e comunicação com usuários.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Compartilhamento de Dados</h2>
          <p>Não vendemos dados pessoais. Compartilhamos informações apenas com prestadores de serviço essenciais (hospedagem, segurança) ou quando exigido por lei.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Segurança</h2>
          <p>Utilizamos criptografia, controle de acesso, auditoria de logs e outras medidas técnicas e administrativas para proteger seus dados contra acessos não autorizados.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Seus Direitos (LGPD)</h2>
          <p>Você tem direito a acessar, corrigir, excluir, portar e revogar consentimentos sobre seus dados. Para exercer esses direitos, entre em contato conosco.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Retenção</h2>
          <p>Mantemos os dados pelo tempo necessário para cumprir finalidades legais e contratuais, respeitando prazos de guarda documental da área da saúde.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Contato</h2>
          <p>Dúvidas sobre esta política podem ser enviadas para suporte@kareon.com.</p>
        </section>
      </div>
    </div>
  </main>
);

export default PoliticaPrivacidade;
