const React = require('react');
const { Text } = require('react-native');

function Icon(props) {
  const { name, children, ...rest } = props || {};
  return React.createElement(Text, rest, children || name || 'Icon');
}

module.exports = Icon;
module.exports.default = Icon;
