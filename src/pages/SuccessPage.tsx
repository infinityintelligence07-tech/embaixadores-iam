import { Link } from "react-router-dom";
import "./SuccessPage.css";

export function SuccessPage() {
  return (
    <main className="success">
      <div className="success__panel">
        <p className="success__kicker">Candidatura enviada</p>
        <h1>
          AGORA É
          <br />
          <span>COM A GENTE</span>
        </h1>
        <p className="success__text">
          Seu perfil entrou na fila de análise. Assim que for aprovado ou
          rejeitado, o time atualiza o status na área administrativa.
        </p>
        <Link className="btn btn--lime" to="/">
          Voltar à página
        </Link>
      </div>
    </main>
  );
}
