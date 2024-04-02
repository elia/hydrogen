export type QuantityRulesProps = {
  maximum: number;
  minimum: number;
  increment: number;
};

export const hasQuantityRules = (quantityRule: QuantityRulesProps) => {
  return (
    quantityRule &&
    (quantityRule?.increment != 1 ||
      quantityRule?.minimum != 1 ||
      quantityRule?.maximum)
  );
};

export function QuantityRules({
  maximum,
  minimum,
  increment,
}: QuantityRulesProps) {
  return (
    <>
      <h4>Quantity Rules</h4>
      <table className="rule-table">
        <tr>
          <th className="table-haeading">Increment</th>
          <th className="table-haeading">Minimum</th>
          <th className="table-haeading">Maximum</th>
        </tr>
        <tr>
          <th className="table-item">{increment}</th>
          <th className="table-item">{minimum}</th>
          <th className="table-item">{maximum}</th>
        </tr>
      </table>
    </>
  );
}
